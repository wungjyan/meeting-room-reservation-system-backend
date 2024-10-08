import { Body, Controller, Post, Get, Query, Inject, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register_user.dto';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequireLogin, UserInfo } from 'src/custom.decorator';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  // 生成 AccessToken
  generateAccessToken(userInfo) {
    return this.jwtService.sign({
      userId: userInfo.id,
      username: userInfo.username,
      roles: userInfo.roles,
      permissions: userInfo.permissions
    }, {
      expiresIn: this.configService.get('jwt_access_token_expires_time') || '30m'
    })
  }

  // 生成 refreshToken
  generateRefreshToken(userInfo) {
    return this.jwtService.sign({
      userId: userInfo.id
    }, {
      expiresIn: this.configService.get('jwt_refresh_token_expres_time') || '7d'
    });
  }

  @Post('register')
  async register(@Body() registerUser: RegisterUserDto) {
    return await this.userService.register(registerUser);
  }

  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`captcha_${address}`, code, 5 * 60);
    console.log('address====', address);

    await this.emailService.sendMail({
      to: address,
      subject: '注册验证码',
      html: `<p>你的注册验证码是${code}</p>`,
    });
    return '发送成功';
  }

  // 普通用户登录
  @Post('login')
  async userLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, false)
    vo.accessToken = this.generateAccessToken(vo.userInfo)
    vo.refreshToken = this.generateRefreshToken(vo.userInfo)
    return vo
  }

  // 管理员用户登录
  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, true)
    vo.accessToken = this.generateAccessToken(vo.userInfo)
    vo.refreshToken = this.generateRefreshToken(vo.userInfo)
    return vo
  }

  // 刷新 token
  @Get('refresh')
  async refresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(data.userId, false);
      const access_token = this.generateAccessToken(user)
      const refresh_token = this.generateRefreshToken(user)

      return {
        access_token,
        refresh_token
      }
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  // 管理员刷新 token
  @Get('admin/refresh')
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(data.userId, true);
      const access_token = this.generateAccessToken(user)
      const refresh_token = this.generateRefreshToken(user)

      return {
        access_token,
        refresh_token
      }
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  @Get('info')
  @RequireLogin()
  async info(@UserInfo('userId') userId: number) {
    const user = await this.userService.findUserDetailById(userId)
    delete user.password
    return user
  }

  // 传入数组，两个路由都生效
  @Post(['update_password', 'admin/update_password'])
  @RequireLogin()
  async updatePassword(@UserInfo('userId') userId: number, @Body() passwordDto: UpdateUserPasswordDto) {
    return await this.userService.updatePassword(userId, passwordDto)
  }

  //  更新密码时发送验证码
  @Get('update_password/captcha')
  async updatePasswordCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`update_password_captcha_${address}`, code, 10 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '更改密码验证码',
      html: `<p>你的更改密码验证码是 ${code}</p>`
    });
    return '发送成功';
  }

  // 更新用户信息
  @Post(['update', 'admin/update'])
  @RequireLogin()
  async update(@UserInfo('userId') userId: number, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(userId, updateUserDto)
  }

  // 更新用户信息发送验证码
  @Get('update/captcha')
  async updateCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`update_user_captcha_${address}`, code, 10 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: '更改用户信息验证码',
      html: `<p>你的验证码是 ${code}</p>`
    });
    return '发送成功';

  }



  @Get('init-data')
  async initData() {
    await this.userService.initData()
    return 'done'
  }
}
