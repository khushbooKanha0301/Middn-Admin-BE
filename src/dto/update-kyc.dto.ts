import { IsOptional, IsString } from "class-validator";

export class UpdateKycDataDto {
  @IsOptional()
  @IsString()
  nationality: string;

  @IsOptional()
  @IsString()
  fname: string;

  @IsOptional()
  @IsString()
  mname: string;

  @IsOptional()
  @IsString()
  lname: string;

  @IsOptional()
  @IsString()
  dob: string;

  @IsOptional()
  @IsString()
  res_address: string;

  @IsOptional()
  @IsString()
  postal_code: string;

  @IsOptional()
  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  country_of_issue: string;

  @IsOptional()
  @IsString()
  verified_with: string;

  @IsOptional()
  passport_url: string;

  @IsOptional()
  user_photo_url: string;

  @IsOptional()
  @IsString()
  wallet_type: string;

  @IsOptional()
  @IsString()
  wallet_address: string;

  @IsOptional()
  is_verified: number;

  @IsOptional()
  kyc_completed: boolean;

  @IsOptional()
  status: boolean;

  @IsOptional()
  is_kyc_deleted:boolean;

  @IsOptional()
	admin_checked_at: string;
	
	@IsOptional()
	kyc_submitted_date: string;
}
