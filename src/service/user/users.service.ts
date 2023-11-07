import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CreateUserDto } from "src/dto/create-users.dto";
import { IUser } from "src/interface/users.interface";
import { Model } from "mongoose";
import { UpdateUserProfileDto } from "src/dto/update-users-profile.dto";
import { ConfigService } from "@nestjs/config";
import { UpdateAccountSettingsDto } from "src/dto/update-account-settings.dto";
const rp = require("request-promise-native");

@Injectable()
export class UserService {
  constructor(
    @InjectModel("user") private userModel: Model<IUser>,
    private configService: ConfigService
  ) {}
  async createUser(CreateUserDto: CreateUserDto): Promise<IUser> {
    const newUser = await new this.userModel(CreateUserDto);
    return newUser.save();
  }
  async updateUser(
    userId: string,
    body: UpdateUserProfileDto,
    file: Express.Multer.File = null,
    bucketName: string = null
  ): Promise<IUser> {
    let key = null;
    if (!!file) {
      const s3 = this.configService.get("s3");
      const bucketName = this.configService.get("aws_s3_bucket_name");
      key = new Date().valueOf() + "_" + file.originalname;

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
      };

      await new Promise(async (resolve, reject) => {
        await s3.upload(params, async function (err, data) {
          if (!err) {
            return resolve(true);
          } else {
            return reject(false);
          }
        });
      });
    }
    if(body.is_profile_deleted)
    {
      body.profile = null;
      delete body.is_profile_deleted;
    }
    const existingUser = await this.userModel.findByIdAndUpdate(
      userId,
      file ? { ...body, profile: key } : { ...body },
      { new: true }
    );
    if (!existingUser) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    return existingUser;
  }

  async updateAccountSettings(
    userId: string,
    body: UpdateAccountSettingsDto
  ): Promise<IUser> {
    const existingUser = await this.userModel.findByIdAndUpdate(userId, {
      ...body,
    });
    if (!existingUser) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    return existingUser;
  }

  async updateUserById(userId: string,body:any): Promise<IUser> {
    const existingUser = await this.userModel.findByIdAndUpdate(userId, {
      ...body,
    });
    if (!existingUser) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    return existingUser;
  }

  async getUser(userId: string): Promise<any> {
    const existingUser = await this.userModel
      .findById(userId)
      .select("-_id -__v -nonce -wallet_address -wallet_type -is_2FA_login_verified -google_auth_secret")
      .exec();
  
    return existingUser;
  }
  async getFindbyAddress(address: string): Promise<any> {
    const existingUser = await this.userModel
      .findOne({ wallet_address: address })
      .exec();
    return existingUser;
  }
  async deleteUser(userId: string): Promise<IUser> {
    const deletedUser = await this.userModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    return deletedUser;
  }
  async getAllUsersExceptAuth(userId: string): Promise<any> {
    const allUsers = await this.userModel.find();
    const existingUser = allUsers.filter((user) => user.id !== userId);
    return existingUser;
  }
  async getUserDetailByAddress(address: string): Promise<any> {
    const existingUser = await this.userModel
      .findOne({ wallet_address: address })
      .exec();
    if (!existingUser) {
      throw new NotFoundException(`Address #${address} not found`);
    }
    return existingUser;
  }
  async getOnlyUserBioByAddress(address: string): Promise<any> {
    const existingUser = await this.userModel
      .findOne({ wallet_address: address })
      .select("wallet_address bio fname_alias lname_alias profile fname lname location -_id")
      .exec();
    if (!existingUser) {
      throw new NotFoundException(`Address #${address} not found`);
    }
    return existingUser;
  }

  async getUsers(
    page?: number,
    pageSize?: number,
    querySearch?: any,
    statusFilter?: any
  ): Promise<any> {
    let usersQuery = this.userModel.find().select('_id nonce joined_at fname_alias lname_alias email fname lname phone phoneCountry');

    if (querySearch !== "null" && querySearch !== null && querySearch !== "") {
      querySearch = querySearch.trim();
      const regexQuery = new RegExp(querySearch);
      usersQuery = usersQuery.where({
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$fname" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$lname" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ["$fname", " ", "$lname"] },
                regex: regexQuery,
                options: "i",
              },
            },
          },
        ],
      });
    }
    if (statusFilter !== "All" && statusFilter !== null) {
      usersQuery = usersQuery.where({ status: statusFilter });
    }

    if (page && pageSize) {
      const skipCount = (page - 1) * pageSize;
      usersQuery = usersQuery.skip(skipCount).limit(pageSize);
    }
    const users = await usersQuery.exec();

    if (!users) {
      throw new NotFoundException(`Users not found`);
    }
    return users;
  }

  async getUserCount(searchQuery: any, statusFilter: any) {
    let userQuery = this.userModel.find();

    if (searchQuery !== "null" && searchQuery !== null && searchQuery !== "") {
      searchQuery = searchQuery.trim();
      const regexQuery = new RegExp(searchQuery);
      userQuery = userQuery.where({
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$fname" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$lname" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ["$fname", " ", "$lname"] },
                regex: regexQuery,
                options: "i",
              },
            },
          },
        ],
      });
    }

    if (statusFilter !== "All") {
      userQuery = userQuery.where({ status: statusFilter });
    }
    const count = await userQuery.countDocuments();
    return count;
  }

  async getUserWithImage(userId) {
    const User = await this.getUser(userId);
      let newImage = "";
      let imageUrl = "";

      const s3 = this.configService.get("s3");
      const bucketName = this.configService.get("aws_s3_bucket_name");

      if (User.profile) {
        newImage = await s3.getSignedUrl("getObject", {
          Bucket: bucketName,
          Key: User.profile ? User.profile : null,
        });
        const options = {
          uri: newImage,
          encoding: null, // set encoding to null to receive the response body as a Buffer
        };
        const imageBuffer = await rp(options);
        imageUrl = "data:image/jpg;base64," + imageBuffer.toString("base64");
        User.imageUrl = imageUrl;
      }
      return User;
  }
}
