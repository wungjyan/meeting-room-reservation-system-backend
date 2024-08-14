interface PermissionInfo {
    id: number;
    code: string;
    description: string;
}
interface UserInfo {
    id: number;

    username: string;

    nickName: string;

    email: string;

    headPic: string;

    phoneNumber: string;

    isFrozen: boolean;

    isAdmin: boolean;

    createTime: number;

    roles: string[];

    permissions: Array<PermissionInfo>
}
export class LoginUserVo {

    userInfo: UserInfo;

    accessToken: string;

    refreshToken: string;
}

