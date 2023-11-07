import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserService } from "src/service/user/users.service";
import { SkipThrottle } from "@nestjs/throttler";
import { AdminService } from "src/service/admin/admin.service";
import { TokenService } from "src/service/token/token.service";
import { IAdmin } from "src/interface/admins.interface";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

var jwt = require("jsonwebtoken");
const moment = require("moment");
const jwtSecret = "eplba";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly adminService: AdminService,
    private readonly tokenService: TokenService,
    @InjectModel("admin") private adminModel: Model<IAdmin>,
  ) {}

  @Get("/getuser/:address")
  async getUserDetailByAddress(
    @Res() response,
    @Param("address") address: string
  ) {
    try {
      let user = await this.userService.getOnlyUserBioByAddress(address);

      let docUrl = "";
      if (user.profile) {
        const s3 = this.configService.get("s3");
        const bucketName = this.configService.get("aws_s3_bucket_name");
        docUrl = await s3.getSignedUrl("getObject", {
          Bucket: bucketName,
          Key: user.profile ? user.profile : "",
          Expires: 604800,
        });
      }

      user.fname_alias = user.fname_alias ? user.fname_alias : "John";
      user.lname_alias = user.lname_alias ? user.lname_alias : "Doe";
      return response.json({ docUrl: docUrl, user: user });
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Post("/forgotpassword")
  async forgotPassword(@Res() response, @Req() req: any) {
    try {
      let validRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
      if (
        req?.body?.email &&
        !req?.body?.email.match(validRegex)
      ) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Invalid E-mail address.",
        });
      }

      const admin = await this.adminService.fetchAdmin(req?.body?.email);
      if(!admin)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Email not exist",
        });
      }
      const user = await this.adminService.forgotPassword(req?.body?.email);
      if (user) {
        return response.status(HttpStatus.OK).json({
          message: "OTP Sent On your Email address",
        });
      } else {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Something went wrong",
        });
      }
    } catch (err) {
      return response.status(HttpStatus.BAD_REQUEST).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Post("/checkOTP")
  async checkOTP(@Res() response, @Req() req: any) {
    try {
      const user = await this.adminModel.findOne({ email: req?.body?.email });
      if (user?.otp == req?.body?.otp) {
        return response.status(HttpStatus.OK).json({
          message: "OTP Verified successfully",
        });
      } else {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Something went wrong",
        });
      }
    } catch (err) {
      return response.status(err.status).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Post("/resetPassword")
  async resetPassword(@Res() response, @Req() req: any) {
    try {
      const user = await this.adminModel.findOne({ email: req?.body?.email });
      if(!user)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "User not found.",
        });
      }
      if(!user.otp)
      {
        return response.status(HttpStatus.BAD_REQUEST).json({
          message: "Token Expired.",
        });
      }
      
      let password = await this.adminService.hashPassword(req.body?.confirmPassword);

      const changePassword = await this.adminModel
        .updateOne(
          { email: req.body?.email },
          { password: password,otp:null }
        )
        .exec();
      if (changePassword) {
        return response.status(HttpStatus.OK).json({
          message: "Your Password Changed successfully",
        });
      }
    } catch (err) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(err.response);
    }
  }

  @SkipThrottle(false)
  @Post("/adminlogin")
  async adminlogin(@Res() response, @Req() req: any) {
    try {
      const result = await this.adminService.adminLogin(
        req.body.userName,
        req.body.password
      );
      if (!result) {
        return response
          .status(HttpStatus.BAD_REQUEST)
          .json({message:"Invalid username or password"});
      }
      const payload = { username: req.body.userName, userId: result._id, access: result.access };
      const token = await jwt.sign(payload, jwtSecret, { expiresIn: "24h" });
      let newToken = await this.tokenService.createToken({ token });
      return response.json({
        token: token,
        userId: result._id,
        message: "Admin logged in successfully",
      });
    } catch (err) {
      if (err.response) {
        return response.status(HttpStatus.BAD_REQUEST).json(err.response);
      } else {
        console.error(err);
        return response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({message:"An error occurred while processing your request"});
      }
    }
  }

  @Post("/adminlogout")
  async adminLogout(@Res() response, @Req() req: any) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      const isTokenDeleted = await this.tokenService.deleteToken(token);
      if (isTokenDeleted) {
        return response.status(HttpStatus.OK).json({
          message: "Admin logged out successfully",
        });
      } else {
        return response.status(HttpStatus.OK).json({
          message: "Something went wrong",
        });
      }
    } catch (err) {
      return response.status(err.status).json(err.response);
    }
  }
}
