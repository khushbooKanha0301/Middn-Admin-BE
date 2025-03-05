import { IsOptional, IsNumber, IsString } from "class-validator";

export class CreateUserDto {
	@IsOptional()
	@IsString()
	fname: string;
	
	@IsOptional()
	@IsString()
	lname: string;

	@IsOptional()
	@IsString()
	fname_alias: string;
	
	@IsOptional()
	@IsString()
	lname_alias: string;

	@IsOptional()
	@IsString()
	phone: string;

	@IsOptional()
	@IsString()
	phoneCountry: string;

	@IsOptional()
	@IsString()
	cca3: string;

	@IsOptional()
	@IsString()
	currentpre: string;

	@IsOptional()
	@IsString()
	city: string;

	@IsOptional()
	@IsString()
	location: string;

	@IsOptional()
	@IsString()
	wallet_address: string;

	@IsOptional()
	@IsString()
	wallet_type: string;
	
	@IsOptional()
	@IsString()
	email: string;

	@IsOptional()
	@IsString()
	nonce: string;

	@IsOptional()
    @IsString()
    createdAt: string;

	@IsOptional()
    @IsString()
    updatedAt: string;

	@IsOptional()
	@IsString()
	bio: string;

	@IsOptional()
	profile: Express.Multer.File;

	@IsOptional()
	@IsString()
	is_2FA_login_verified: string;

	@IsOptional() 
	@IsString() 
	last_login_at: string;

	@IsOptional()
	@IsString()
	joined_at: string;

	@IsOptional()
	is_banned: boolean;

	@IsOptional()
	@IsNumber()
	is_verified: number;

	@IsOptional()
	kyc_completed: boolean;

	@IsOptional()
	email_verified: boolean;

	@IsOptional()
	@IsNumber()
	phone_verified: number;

	@IsOptional()
	is_kyc_deleted:boolean;

	@IsOptional()
	admin_checked_at: string;
	
	@IsOptional()
	kyc_submitted_date: string;

	@IsOptional()
	@IsString()
	twilioOTP: string;

	@IsOptional()
	@IsString()
	otpCreatedAt: string;

	@IsOptional()
	@IsString()
	otpExpiresAt: string;

	@IsOptional()
	@IsString()
	is_2FA_twilio_login_verified: boolean;

	@IsOptional()
	@IsString()
	is_2FA_SMS_enabled: boolean;
}