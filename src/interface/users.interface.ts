import { Document } from 'mongoose';

export interface IUser extends Document{
    readonly fname: string;
    readonly lname: string;
    readonly fname_alias: string;
    readonly lname_alias: string;
    readonly email: string;
	readonly phone: string;
	readonly phoneCountry: string;
	readonly currentpre: string;
	readonly city: string;
	readonly location: string;
    readonly wallet_address: string;
	readonly wallet_type: string;
    readonly created_at: string;
    readonly updated_at: string;
    readonly bio: string;
    readonly profile: Express.Multer.File;
    google_auth_secret: string;
    is_2FA_enabled: boolean;
    is_2FA_login_verified: boolean;
    readonly last_login_at: string;
    readonly joined_at: string;
    readonly is_banned: boolean;
    readonly is_verified: number;
    readonly kyc_completed: boolean;
    readonly email_verified: number;
    readonly phone_verified: number;
    readonly is_kyc_deleted: boolean;
    readonly passport_url: Express.Multer.File;
    readonly user_photo_url: Express.Multer.File;
    readonly admin_checked_at: string;
    readonly kyc_submitted_date: string;
}