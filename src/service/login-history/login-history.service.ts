import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILoginHistory } from 'src/interface/loginHisory.interface';

@Injectable()
export class LoginHistoryService {
    constructor(
        @InjectModel("login_history") private loginHistoryModel: Model<ILoginHistory>,
      ) {}

    async getLoginHistory(id: string,page: number,pageSize: number)
    {
        let loginHistoryQuery = this.loginHistoryModel.aggregate([
            {
                $match: {
                  user_id: id 
                }
              },
            {
                $lookup: {
                  from: "users",
                  localField: "wallet_address",
                  foreignField: "wallet_address",
                  as: "user_info"
                }
            },
            {
                $unwind: "$user_info"
            },
            {
                $project: {
                    "user_name": {
                        $concat: ["$user_info.fname", " ", "$user_info.lname"]
                    },
                    "ip_address":"$ip_address",
                    "location":"$location",
                    "browser":"$browser",
                    "login_at":"$login_at",
                }
            },
            {
                $sort: {
                    login_at: -1 // Sort by created_at in descending order
                }
            }
        ]);
        
        if (page && pageSize) {
            const skipCount = (page - 1) * pageSize;
            loginHistoryQuery = loginHistoryQuery.skip(skipCount).limit(pageSize);
        }
        
        return await loginHistoryQuery.exec();
    }

    async getLoginHistoryCount(id:string)
    {
        const filter = id ? { user_id:id } : {};
        let loginHistoryQuery = this.loginHistoryModel.find(filter);
        return await loginHistoryQuery.countDocuments();
    }
}
