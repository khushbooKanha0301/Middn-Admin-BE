import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  Res,
  Req,
  NotFoundException,
  Param,
  Post,
  BadRequestException
} from "@nestjs/common";
import { UserService } from "src/service/user/users.service";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { SkipThrottle } from "@nestjs/throttler";
import { LoginHistoryService } from "src/service/login-history/login-history.service";
import { IUser } from "src/interface/users.interface";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
const moment = require("moment");

@SkipThrottle()
@Controller("users")
export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly mailerService: MailerService,
    private configService: ConfigService,
    @InjectModel("user") private userModel: Model<IUser>,
  ) {}

  @Get("/userList")
  async userList(@Req() req: any, @Res() response) {
    try {
      const page = req.query.page ? req.query.page : 1;
      const pageSize = req.query.pageSize ? req.query.pageSize : 5;
      const searchQuery =
        req.query.query !== undefined ? req.query.query.trim() : null;
      const statusFilter = req.query.statusFilter
        ? req.query.statusFilter
        : null;
      const usersData = await this.userService.getUsers(
        page,
        pageSize,
        searchQuery,
        statusFilter
      );

      const usersCount = await this.userService.getUserCount(
        searchQuery,
        statusFilter
      );

      const totalCount = await this.userService.getTotalUsersCount();
      const activeCount = await this.userService.getActiveCount();
      const banCount = await this.userService.getBanCount();
      const emailCount = await this.userService.getEmailCount();
      const phoneCount = await this.userService.getPhoneCount();

      if (!usersData) {
        throw new NotFoundException(`Users not found`);
      }
      return response.status(HttpStatus.OK).json({
        message: "User found successfully",
        users: usersData,
        totalUsersCount: totalCount,
        activeCount: activeCount,
        banCount: banCount,
        emailCount: emailCount,
        phoneCount: phoneCount
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Put("/updateUser/:id")
  async updateUser(
    @Req() req: any,
    @Res() response,
    @Body() userData: any,
    @Param() param: { id: string }
  ) {
    try {
      userData.fname = userData.fname.trim();
      userData.lname = userData.lname.trim();
      userData.email = userData.email.trim();
      userData.phone = userData.phone.trim();
      
      const UserId = param.id;

      if(!userData.fname)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Please enter first name.",
        });
      }

      if(!userData.lname)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Please enter last name.",
        });
      }

      if(!userData.phoneCountry)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Please enter country code.",
        });
      }
      
      if(!userData.email)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Please enter email.",
        });
      }

      let validRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
      if (
        userData.email &&
        !userData.email.match(validRegex)
      ) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Invalid E-mail address.",
        });
      }
      
      if (userData.email) {
        let userEmail = await this.userService.getFindbyEmail(
          UserId,
          userData.email
        );
        if (userEmail.length) {
          return response.status(HttpStatus.BAD_REQUEST).json({
            message: "Email already Exist.",
          });
        }
      }
      if(!userData.phone)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Please enter phone number.",
        });
      }
      
      if (
        userData.phone &&
        !userData.phone.match("^[0-9]{5,10}$")
      ) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Invalid Phone.",
        });
      }      
      
      if (userData.phone) {
        let userPhone = await this.userService.getFindbyPhone(
          UserId,
          userData.phone
        );
        if (userPhone.length) {
          return response.status(HttpStatus.BAD_REQUEST).json({
            message: "Phone already Exist.",
          });
        } 
      }

      const countryCode = [
        "+93",
        "+355",
        "+213",
        "+1-684",
        "+376",
        "+244",
        "+1-264",
        "+672",
        "+1-268",
        "+54",
        "+374",
        "+297",
        "+61",
        "+43",
        "+994",
        "+1-242",
        "+973",
        "+880",
        "+1-246",
        "+375",
        "+32",
        "+501",
        "+229",
        "+1-441",
        "+975",
        "+591",
        "+387",
        "+267",
        "+55",
        "+246",
        "+1-284",
        "+673",
        "+359",
        "+226",
        "+257",
        "+855",
        "+237",
        "+1",
        "+238",
        "+1-345",
        "+236",
        "+235",
        "+56",
        "+86",
        "+61",
        "+61",
        "+57",
        "+269",
        "+682",
        "+506",
        "+385",
        "+53",
        "+599",
        "+357",
        "+420",
        "+243",
        "+45",
        "+253",
        "+1-767",
        "+1-809, 1-829, 1-849",
        "+670",
        "+593",
        "+20",
        "+503",
        "+240",
        "+291",
        "+372",
        "+251",
        "+500",
        "+298",
        "+679",
        "+358",
        "+33",
        "+689",
        "+241",
        "+220",
        "+995",
        "+49",
        "+233",
        "+350",
        "+30",
        "+299",
        "+1-473",
        "+1-671",
        "+502",
        "+44-1481",
        "+224",
        "+245",
        "+592",
        "+509",
        "+504",
        "+852",
        "+36",
        "+354",
        "+91",
        "+62",
        "+98",
        "+964",
        "+353",
        "+44-1624",
        "+972",
        "+39",
        "+225",
        "+1-876",
        "+81",
        "+44-1534",
        "+962",
        "+7",
        "+254",
        "+686",
        "+383",
        "+965",
        "+996",
        "+856",
        "+371",
        "+961",
        "+266",
        "+231",
        "+218",
        "+423",
        "+370",
        "+352",
        "+853",
        "+389",
        "+261",
        "+265",
        "+60",
        "+960",
        "+223",
        "+356",
        "+692",
        "+222",
        "+230",
        "+262",
        "+52",
        "+691",
        "+373",
        "+377",
        "+976",
        "+382",
        "+1-664",
        "+212",
        "+258",
        "+95",
        "+264",
        "+674",
        "+977",
        "+31",
        "+599",
        "+687",
        "+64",
        "+505",
        "+227",
        "+234",
        "+683",
        "+850",
        "+1-670",
        "+47",
        "+968",
        "+92",
        "+680",
        "+970",
        "+507",
        "+675",
        "+595",
        "+51",
        "+63",
        "+64",
        "+48",
        "+351",
        "+1-787, 1-939",
        "+974",
        "+242",
        "+262",
        "+40",
        "+7",
        "+250",
        "+590",
        "+290",
        "+1-869",
        "+1-758",
        "+590",
        "+508",
        "+1-784",
        "+685",
        "+378",
        "+239",
        "+966",
        "+221",
        "+381",
        "+248",
        "+232",
        "+65",
        "+1-721",
        "+421",
        "+386",
        "+677",
        "+252",
        "+27",
        "+82",
        "+211",
        "+34",
        "+94",
        "+249",
        "+597",
        "+47",
        "+268",
        "+46",
        "+41",
        "+963",
        "+886",
        "+992",
        "+255",
        "+66",
        "+228",
        "+690",
        "+676",
        "+1-868",
        "+216",
        "+90",
        "+993",
        "+1-649",
        "+688",
        "+1-340",
        "+256",
        "+380",
        "+971",
        "+44",
        " +1",
        "+598",
        "+998",
        "+678",
        "+379",
        "+58",
        "+84",
        "+681",
        "+212",
        "+967",
        "+260",
        "+263",
      ];
      if (
        userData.phoneCountry &&
        !countryCode.includes(userData.phoneCountry)
      ) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Invalid country code.",
        });
      }

      await this.userService.updateUserById(
        UserId,
        userData
      );
      const user = await this.userService.getUserWithImage(UserId);
      return response.status(HttpStatus.OK).json({
        message: "Users has been successfully updated.",
        User:user
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @Get("/getUserById/:id")
  async getUserById(@Req() req: any, @Res() response,@Param() param: { id: string }) {
    try {
      const userId = param.id;
      const user = await this.userService.getUserWithImage(userId);

      return response.status(HttpStatus.OK).json({
        message: "User found successfully",
        User:user
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @Get("/getLoginHistory/:id")
  async getLoginHistory(@Req() req: any, @Res() response,@Param() param: { id: string }) {
    try {
      const id = param.id;
      if(!id)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "User Id not found.",
        });
      }
      const userExist = await this.userService.getUser(id);
      if(!userExist)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "User not found.",
        });
      }
      const page = req.query.page ? +req.query.page : 1;
      const pageSize = req.query.pageSize ? +req.query.pageSize : 10;
      const loginHistory = await this.loginHistoryService.getLoginHistory(id,page,pageSize);
      const loginHistoryCount = await this.loginHistoryService.getLoginHistoryCount(id);
      return response.status(HttpStatus.OK).json({
        loginHistory,
        loginHistoryCount
      });
    } catch (err) {
      console.log(err);
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Post("/twoFADisableUser/:id")
  async twoFADisableUser(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`User #${param.id} not found`);
      }
      if (user.is_2FA_enabled === false) {
        return response
          .status(HttpStatus.BAD_REQUEST)
          .json({message:"This user's 2FA already disabled"});
      }
      user.is_2FA_enabled = false;
      user.is_2FA_login_verified = true;
      user.google_auth_secret = "";
      await user.save();
      const userObj = await this.userService.getUserWithImage(param.id);
      return response.status(HttpStatus.OK).json({
        message: "User's Google 2FA Disabled successfully",
        User: userObj,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @Get("/getUsersCount")
  async getUsersCount(@Res() response, @Req() req: any) {
    try {
      const totalUser = await this.userModel.countDocuments().exec();

      return response.status(HttpStatus.OK).json({
        message: "Get Users successfully",
        totalUser: totalUser,
      });
    } catch (err) {
      return response.status(err.status).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Put("/bannedUser/:id")
  async bannedUser(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`User not found`);
      }
      if (user.is_banned === true) {
        throw new BadRequestException("User already blocked");
      }
      await this.userService.updateUserById(
        param.id,
        { is_banned: true }
      );
      const users = await this.userModel.findById(param.id).exec();
      return response.status(HttpStatus.OK).json({
        message: "User Blocked successfully",
        users: users,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Put("/activeUser/:id")
  async activeUser(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`User not found`);
      }
      if (user?.is_banned === false) {
        throw new BadRequestException(`User status already active`);
      }
      if (user?.email_verified === 0 || user?.email_verified === undefined) {
        throw new BadRequestException(`User Email Unverified`);
      }

      if (user?.phone_verified === 0 || user?.phone_verified === undefined) {
        throw new BadRequestException(`User Mobile Unverified`);
      }
      
      await this.userService.updateUserById(
        param.id,
        { is_banned: false }
      );

      const users = await this.userModel.findById(param.id).exec();

      return response.status(HttpStatus.OK).json({
        message: "User Status Activated successfully",
        users: users,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Get("/acceptKyc/:id")
  async acceptKyc(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const userData = await this.userModel.findById(param.id);
      if (!userData) {
        throw new NotFoundException(`KYC not found`);
      }
      
      if(userData?.is_verified === 1)
      {
        throw new BadRequestException("User's KYC already Approved");
      }
      const currentDate = moment.utc().format();
      await this.userService.updateUserById(
        param.id,
        { is_verified: 1, admin_checked_at: currentDate}
      );

      const users = await this.userModel.findById(param.id).exec();
      if (!users) {
        throw new NotFoundException(`Users not found`);
      }
      return response.status(HttpStatus.OK).json({
        message: "User found successfully",
        users: users,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Put("/userEmailVerified/:id")
  async userEmailVerified(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      if (!user?.email) {
        throw new BadRequestException(`Email isn't exists`);
      }

      if (user?.email_verified === 1) {
        throw new BadRequestException(`User email already verified`);
      }
      
      await this.userService.updateUserById(
        param.id,
        { email_verified: 1 }
      );

      const users = await this.userModel.findById(param.id).exec();

      return response.status(HttpStatus.OK).json({
        message: "User Email Verified successfully",
        users: users,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }
  
  @SkipThrottle(false)
  @Put("/userMobileVerified/:id")
  async userMobileVerified(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`User not found`);
      }
      if (!user?.phone) {
        throw new BadRequestException(`Phone isn't exists`);
      }

      if (user?.phone_verified === 1) {
        throw new BadRequestException(`User Phone already verified`);
      }
      
      await this.userService.updateUserById(
        param.id,
        { phone_verified: 1 }
      );

      const users = await this.userModel.findById(param.id).exec();

      return response.status(HttpStatus.OK).json({
        message: "User Phone Verified successfully",
        users: users,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Post("/rejectKyc/:id")
  async rejectKyc(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`KYC not found`);
      }
      if(user?.is_kyc_deleted)
      {
        throw new BadRequestException("KYC not found")
      }
      if(user?.is_verified === 1)
      {
        throw new BadRequestException("User's KYC already Approved");
      }
      if (user?.is_verified === 2) {
        throw new BadRequestException("User's KYC already Rejected");
      }
      let currentDate = moment.utc().format();
      const users = await this.userModel
        .updateOne(
          { _id: param.id },
          { is_verified: 2, admin_checked_at: currentDate }
        )
        .exec();
      if (user.email) {
        this.mailerService.sendMail({
          to: user?.email,
          subject: "Middn :: Your KYC has been rejected",
          template: "message",
          context: {
            title: "Sorry !!! Your KYC has been Rejected",
            message: req.body.message ? req.body.message : "Reason not added",
          },
        }).catch((error)=>{
          console.log(error);
        });
      }
      if (!users) {
        throw new NotFoundException(`Users not found`);
      }
      return response.status(HttpStatus.OK).json({
        message: "User found successfully",
        users: users,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @Get("/kycUserList")
  async kycUserList(@Req() req: any, @Res() response) {
    try {
      const page = req.query.page ? req.query.page : 1;
      const pageSize = req.query.pageSize ? req.query.pageSize : 5;
      const searchQuery = req.query.query !== undefined ? req.query.query : null;
      const statusFilter = req.query.statusFilter ? req.query.statusFilter : null;
      const usersData = await this.userService.getKycUsers(
        page,
        pageSize,
        searchQuery,
        statusFilter
      );

      const usersCount = await this.userService.getKycUserCount(
        searchQuery,
        statusFilter
      );
      if (!usersData) {
        throw new NotFoundException(`Users not found`);
      }
      return response.status(HttpStatus.OK).json({
        message: "User found successfully",
        users: usersData,
        totalUsersCount: usersCount,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @Get("/viewKyc/:id")
  async viewKyc(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).select("-referred_by -wallet_type -nonce -is_2FA_login_verified -__v -google_auth_secret").exec();
      if (!user) {
        throw new NotFoundException(`KYC not found`);
      }
      if (user?.is_kyc_deleted) {
        throw new NotFoundException(`KYC not found`);
      }
      let passport_url = "";
      let user_photo_url = "";
      if (user.passport_url) {
        const s3 = this.configService.get("s3");
        const bucketName = this.configService.get("aws_s3_bucket_name");
        passport_url = await s3.getSignedUrl("getObject", {
          Bucket: bucketName,
          Key: user.passport_url ? user.passport_url : "",
          Expires: 604800,
        });
      }
      if (user.user_photo_url) {
        const s3 = this.configService.get("s3");
        const bucketName = this.configService.get("aws_s3_bucket_name");
        user_photo_url = await s3.getSignedUrl("getObject", {
          Bucket: bucketName,
          Key: user.user_photo_url ? user.user_photo_url : "",
          Expires: 604800,
        });
      }

      return response.status(HttpStatus.OK).json({
        message: "User found successfully",
        user: user,
        passport_url: passport_url,
        user_photo_url: user_photo_url,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Get("/deleteKyc/:id")
  async deleteKyc(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const userData = await this.userModel.findById(param.id);
      if(!userData)
      {
        throw new NotFoundException(`KYC not found`);
      }
      if (userData?.is_kyc_deleted === true) {
        throw new BadRequestException(`User's KYC already deleted`);
      }
      const user = await this.userModel
        .findByIdAndUpdate(
          param.id,
          {
            $set: {
              mname: "",
              res_address: "",
              postal_code: "",
              city: "",
              country_of_issue: "",
              verified_with: "",
              passport_url: "",
              user_photo_url: "",
              is_kyc_deleted: true,
              kyc_completed: false,
              is_verified: 0,
            },
          },
          { new: true }
        )
        .exec();
      if (!user) {
        throw new NotFoundException(`User #${param.id} not found`);
      }

      return response.status(HttpStatus.OK).json({
        message: "User KYC deleted successfully...",
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }
  
}
