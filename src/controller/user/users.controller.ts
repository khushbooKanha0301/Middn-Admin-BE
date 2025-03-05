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
import { ReportUserService } from "src/service/report-users/reportUser.service";
const moment = require("moment");

@SkipThrottle()
@Controller("users")
export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly mailerService: MailerService,
    private readonly reportUserService: ReportUserService,
    private configService: ConfigService,
    @InjectModel("user") private userModel: Model<IUser>,
  ) {}

  /**
   * Retrieves a list of users based on optional query parameters such as page, pageSize, searchQuery, and statusFilter.
   * @param req 
   * @param response 
   * @returns 
   */
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
        totalUsersCount: usersCount,
        allUserCount: totalCount,
        activeCount: activeCount,
        banCount: banCount,
        emailCount: emailCount,
        phoneCount: phoneCount
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  /**
   * Updates user information with the provided data.
   * @param req 
   * @param response 
   * @param userData 
   * @param param 
   * @returns 
   */
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
        try {
          // Check if the email already exists in the system
          const userEmail = await this.userService.getFindbyEmail(userData.email);
          
          // Safely check if userEmail exists before accessing its properties
          if (userEmail && userEmail._id && userEmail._id.toString() !== UserId) {
            return response.status(HttpStatus.BAD_REQUEST).json({
              message: "Email already exists.",
            });
          }
      
          // Check if the email is being updated and is verified
          const userEmailCheck = await this.userService.getFindbyId(UserId);
         
          // If the email is verified and the user is trying to change it
          if (userEmailCheck && userEmailCheck.email_verified && userEmailCheck.email !== userData.email) {
            return response.status(HttpStatus.BAD_REQUEST).json({
              message: "Your email address is already verified and cannot be changed.",
            });
          }
        } catch (error) {
          console.error("Error while checking email existence: ", error);
          return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while processing the request.",
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
        try {
          // Check if the phone already exists in the system
          const userPhone = await this.userService.getFindbyPhone(userData.phone);
          
          // Safely check if userEmail exists before accessing its properties
          if (userPhone && userPhone._id && userPhone._id.toString() !== UserId) {
            return response.status(HttpStatus.BAD_REQUEST).json({
              message: "Phone already exists.",
            });
          }
      
          // Check if the phone is being updated and is verified
          const userPhoneCheck = await this.userService.getPhonebyId(UserId);
          
          // If the phone is verified and the user is trying to change it
          if (userPhoneCheck && userPhoneCheck.phone_verified && (userPhoneCheck?.phone !== userData?.phone || userPhoneCheck?.phoneCountry !== userData?.phoneCountry)) {
            return response.status(HttpStatus.BAD_REQUEST).json({
              message: "Your phone is already verified and cannot be changed.",
            });
          }
        } catch (error) {
          console.error("Error while checking phone existence: ", error);
          return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while processing the request.",
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
      console.log("userData", userData)
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

  /**
   * Retrieves a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   * Retrieves login history for a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   * Disables Two-Factor Authentication (2FA) for a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   * Retrieves the total count of users.
   * @param response 
   * @param req 
   * @returns 
   */
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

  /**
   * This Api endpoint is used to Bans a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   *  Activates a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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
      if (!user?.email_verified || user?.email_verified === undefined) {
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

  /**
   * Accepts KYC for a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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
      const updateData = await this.userModel.findById(param.id);
      if (updateData.is_verified == 1 && updateData.email) {
        const globalContext = {
          formattedDate: moment().format("dddd, MMMM D, YYYY"),
          greeting: `Dear ${updateData?.fname
            ? updateData?.fname + " " + updateData?.lname
            : "John Doe" + ","}`,
          heading: "KYC Approved Email",
          para1: "Thank you for submitting your verification request.",
          para2: "We are pleased to let you know that your identity (KYC) has been verified and you are granted to participate in our token sale.",
          para3: "We invite you to get back to contributor account and purchase token before sales end.",
          title: "KYC Approved Email"
        };
        this.mailerService
        .sendMail({
          to: updateData?.email,
          subject: "Middn :: KYC Verified : Contribute",
          template: "confirm-email",
          context: {
            ...globalContext
          },
        })
        .catch((error) => {
          console.log(error);
        });
      }

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

  /**
   * Marks a user's email as verified by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

      if (user?.email_verified) {
        throw new BadRequestException(`User email already verified`);
      }
      
      await this.userService.updateUserById(
        param.id,
        { email_verified: true }
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
  
  /**
   *  Marks a user's mobile phone as verified by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   * Retrieves the user by their ID, checks if the KYC is already approved or rejected,
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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
      const updateData = await this.userModel.findById(param.id);
      
      if (updateData.email && updateData.is_verified === 2) {
        const globalContext = {
          formattedDate: moment().format('dddd, MMMM D, YYYY'),
         
          greeting: `Dear ${updateData?.fname
            ? updateData?.fname + " " + updateData?.lname
            : "John Doe" + ","}`,
          para1: "Thank you for submitting your verification request. We're having difficulties verifying your identity.",
          para2: "The information you had submitted was unfortunately rejected for following reason:",
          message: req.body.message ? req.body.message : "Reason not added",
          para3: "Don't be upset! Still you want to verity your identity, please get back to your account and fill form with proper information and upload correct documents to complete your identity verification process.",
          title: "KYC Rejected Email"
        };

        this.mailerService
          .sendMail({
            to: updateData?.email,
            subject: "Middn :: KYC Application has been rejected",
            template: "confirm-email",
            context: {
              ...globalContext
            },
          })
          .catch((error) => {
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

  /**
   * Retrieves a list of users for KYC verification.
   * with optional pagination, search query, and status filter.
   * @param req 
   * @param response 
   * @returns 
   */
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

  /**
   * Retrieves KYC details of a user by ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   * Deletes KYC details of a user by ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
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

  /**
   * Retrieves a list of reported users.
   * @param req 
   * @param response 
   * @returns 
   */
  @Get("/reportUserList")
  async reportUserList(@Req() req: any, @Res() response) {
    try {
      const page = req.query.page ? req.query.page : 1;
      const pageSize = req.query.pageSize ? req.query.pageSize : 5;
      const searchQuery = req.query.query !== undefined ? req.query.query : null;
    
      const usersData = await this.reportUserService.getReportUsers(
        page,
        pageSize,
        searchQuery
      );

      const usersCount = await this.reportUserService.getReportUserCount(searchQuery);
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

  /**
   * Retrieves reported users by their address.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
   */
  @Get("/reportUser/:address")
  async reportUser(@Req() req: any, @Res() response,   @Param() param: { address: string }) {
    try {
      const page = req.query.page ? req.query.page : 1;
      const pageSize = req.query.pageSize ? req.query.pageSize : 5;
      const searchQuery = req.query.query !== undefined ? req.query.query : null;
    
      const usersData = await this.reportUserService.getReportUsersById(
        page,
        pageSize,
        param.address,
        searchQuery
      );

      const usersCount = await this.reportUserService.getReportUserCountById(param.address);
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
  
  /**
   * Disables Two-Factor Authentication (2FA) for a user by their ID.
   * @param req 
   * @param response 
   * @param param 
   * @returns 
  */
  @SkipThrottle(false)
  @Post("/twoFASMSDisableUser/:id")
  async twoFASMSDisableUser(
    @Req() req: any,
    @Res() response,
    @Param() param: { id: string }
  ) {
    try {
      const user = await this.userModel.findById(param.id).exec();
      if (!user) {
        throw new NotFoundException(`User #${param.id} not found`);
      }
      if (user.is_2FA_SMS_enabled === false) {
        return response
          .status(HttpStatus.BAD_REQUEST)
          .json({message:"This user's SMS 2FA already disabled"});
      }
      user.is_2FA_SMS_enabled = false;
      user.is_2FA_twilio_login_verified = true;
      user.twilioOTP = null;
      user.otpCreatedAt = null;
      user.otpExpiresAt = null;
      await user.save();
      const userObj = await this.userService.getUserWithImage(param.id);
      return response.status(HttpStatus.OK).json({
        message: "User's SMS 2FA Disabled successfully",
        User: userObj,
      });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }
}
