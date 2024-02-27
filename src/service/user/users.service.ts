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
    let usersQuery = this.userModel.find().select('_id nonce joined_at fname_alias lname_alias email fname lname phone phoneCountry is_banned email_verified phone_verified');
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
    let users;
    if(statusFilter === 'Active'){
      usersQuery = usersQuery.where({
        $or: [
          { is_banned: false },
          { is_banned: undefined }
        ],
        $and: [
          {email_verified:1, phone_verified : 1} 
        ]
      });
      // users.activeCount = await usersQuery.countDocuments();
    } else if (statusFilter === 'Ban'){
      usersQuery = usersQuery.where({
        is_banned:true
      });
    } else if (statusFilter === 'Email'){
      usersQuery = usersQuery.where({
        $or: [
          { email_verified:0 },
          { email_verified: undefined }
        ],
        is_banned: { $ne: true }
      });
    } else if (statusFilter === 'Mobile'){
      usersQuery = usersQuery.where({
        $or: [
          { phone_verified: 0 },
          { phone_verified: undefined }
        ],
        is_banned: { $ne: true }
      });
    }

    if (page && pageSize) {
      const skipCount = (page - 1) * pageSize;
      usersQuery = usersQuery.skip(skipCount).limit(pageSize);
    }
    users = await usersQuery.exec();
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
        ]
      });
    }

    if(statusFilter === 'Active'){
      userQuery = userQuery.where({
        $or: [
          { is_banned: false },
          { is_banned: undefined }
        ],
        $and: [
          {email_verified:1, phone_verified : 1} 
        ]
      });
    } else if (statusFilter === 'Ban'){
      userQuery = userQuery.where({
        is_banned:true
      });
    } else if (statusFilter === 'Email'){
      userQuery = userQuery.where({
        $or: [
          { email_verified:0 },
          { email_verified: undefined }
        ],
        is_banned: { $ne: true }
      });
    } else if (statusFilter === 'Mobile'){
      userQuery = userQuery.where({
        $or: [
          { phone_verified:0 },
          { phone_verified: undefined }
        ],
        is_banned: { $ne: true }
      });
    }
    const count = await userQuery.countDocuments();
    return count;
  }

  async getActiveCount() {
    let userQuery = this.userModel.find();
    userQuery = userQuery.where({
      $or: [
        { is_banned: false },
        { is_banned: undefined }
      ],
      $and: [
        {email_verified:1, phone_verified : 1} 
      ]
    });
    const activeCount = await userQuery.countDocuments();
    return activeCount
  }

  async getTotalUsersCount() {
    let userQuery = this.userModel.find();
    const totalCount = await userQuery.countDocuments();
    return totalCount
  }


  async getBanCount() {
    let userQuery = this.userModel.find();
    userQuery = userQuery.where({
      is_banned:true
    });
    const banCount = await userQuery.countDocuments();
    return banCount
  }

  async getEmailCount() {
    let userQuery = this.userModel.find();
    userQuery = userQuery.where({
      $or: [
        { email_verified: 0 },
        { email_verified: undefined }
      ],
      is_banned: { $ne: true }
    });
    const emailCount = await userQuery.countDocuments();
    return emailCount
  }

  async getPhoneCount() {
    let userQuery = this.userModel.find();
    userQuery = userQuery.where({
      $or: [
        { phone_verified:0 },
        { phone_verified: undefined }
      ],
      is_banned: { $ne: true }
    });
    const phoneCount = await userQuery.countDocuments();
    return phoneCount
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

  async getFindbyEmail(_id: string, email: string): Promise<any>{
    const existingUser = await this.userModel
    .findOne({ $and: [{ _id }, { email }] })
    .select("-_id email")
    .exec();
    if(existingUser){
      return existingUser
    }
    return [];
  }
  async getFindbyPhone(_id: string, phone: string): Promise<any>{
    const existingUser = await this.userModel
    .findOne({ $and: [{ _id }, { phone }] })
    .select("-_id phone")
    .exec();
    if(existingUser){
      return existingUser
    }
    return [];
  }

  async getKycUsers(
    page?: number,
    pageSize?: number,
    querySearch?: any,
    statusFilter?: any
  ): Promise<any> {
    let usersQuery = this.userModel.find({
      kyc_completed: true,
    });

    if (querySearch !== "null" && querySearch !== null) {
      querySearch = querySearch.trim();
      const regexQuery = new RegExp(querySearch);
      usersQuery = usersQuery.where({
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$wallet_address" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
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
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$email" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$phone" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$city" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$verified_with" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
        ],
      });
    }
    if (statusFilter !== "All" && statusFilter !== null) {
      if (statusFilter === "Pending") {
        usersQuery = usersQuery.where({ is_verified: 0 });
      } else if (statusFilter === "Approved") {
        usersQuery = usersQuery.where({ is_verified: 1 });
      } else if (statusFilter === "Rejected") {
        usersQuery = usersQuery.where({ is_verified: 2 });
      }
    }

    if (page && pageSize) {
      // Calculate the number of documents to skip
      const skipCount = (page - 1) * pageSize;
      usersQuery = usersQuery.skip(skipCount).limit(pageSize);
    }
    usersQuery = usersQuery.select("-google_auth_secret -nonce -wallet_type -__v -is_2FA_login_verified -is_kyc_deleted -referred_by");
    const users = await usersQuery.exec();

    if (!users) {
      throw new NotFoundException(`Users not found`);
    }
    return users;
  }
  async getKycUserCount(searchQuery: any, statusFilter: any) {
    let userQuery = this.userModel.find();

    if (searchQuery !== "null" &&  searchQuery !== null) {
      searchQuery = searchQuery.trim();
      const regexQuery = new RegExp(searchQuery);
      userQuery = userQuery.where({
        $or: [
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$wallet_address" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
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
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$email" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$phone" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$city" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$verified_with" },
                regex: regexQuery,
                options: "i",
              },
            },
          },
        ],
      });
    }

    if (statusFilter !== "All") {
      if (statusFilter === "Pending") {
        userQuery = userQuery.where({ is_verified: 0 });
      } else if (statusFilter === "Approved") {
        userQuery = userQuery.where({ is_verified: 1 });
      } else if (statusFilter === "Rejected") {
        userQuery = userQuery.where({ is_verified: 2 });
      }
    }
    const count = await userQuery.countDocuments({ kyc_completed: true });
    return count;
  }
}
