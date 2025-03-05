import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { IReportUsers } from "src/interface/reportUsers.interface";
import { Model } from "mongoose";

@Injectable()
export class ReportUserService {
  constructor(
    @InjectModel("report_users") private reportUserModel: Model<IReportUsers>
  ) {}

  async getReportUsers(
    page?: number,
    pageSize?: number,
    querySearch?: any
  ): Promise<any> {
    try {
      let reportUsersQuery: any[] = [
        {
          $lookup: {
            from: "users",
            localField: "report_from_user_address",
            foreignField: "wallet_address",
            as: "user_info",
          },
        },
        {
          $unwind: {
            path: "$user_info",
            preserveNullAndEmptyArrays: true, // Make the join optional
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "report_to_user_address",
            foreignField: "wallet_address",
            as: "users_info",
          },
        },
        {
          $unwind: {
            path: "$users_info",
            preserveNullAndEmptyArrays: true, // Make the join optional
          },
        },
        {
          $project: {
            fname_alias: "$user_info.fname_alias",
            lname_alias: "$user_info.lname_alias",
            fname_to_alias: "$users_info.fname_alias",
            lname_to_alias: "$users_info.lname_alias",
            report_from_user_address: "$report_from_user_address",
            report_to_user_address: "$report_to_user_address",
            reason: "$reason",
            created_at: "$created_at",
          },
        },
      ];

      if (
        querySearch &&
        querySearch !== "null" &&
        querySearch !== null &&
        querySearch !== ""
      ) {
        querySearch = querySearch.trim();
        const regexQuery = new RegExp(querySearch);
        reportUsersQuery.push({
          $match: {
            $or: [
              { fname_alias: { $regex: regexQuery, $options: "i" } },
              { lname_alias: { $regex: regexQuery, $options: "i" } },
              { fname_to_alias: { $regex: regexQuery, $options: "i" } },
              { lname_to_alias: { $regex: regexQuery, $options: "i" } },
              { reason: { $regex: regexQuery, $options: "i" } },
            ],
          },
        });
      }

      if (page && pageSize) {
        pageSize = Number(pageSize);

        reportUsersQuery.push(
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize }
        );
      }

      // Execute the aggregation query
      const users = await this.reportUserModel.aggregate(reportUsersQuery);
      if (!users) {
        throw new NotFoundException(`Users not found`);
      }
      return users;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getReportUserCount(querySearch?: any): Promise<number> {
    let reportUsersQuery: any[] = [
        {
            $lookup: {
                from: "users",
                localField: "report_from_user_address",
                foreignField: "wallet_address",
                as: "user_info",
            },
        },
        {
            $unwind: {
                path: "$user_info",
                preserveNullAndEmptyArrays: true, // Make the join optional
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "report_to_user_address",
                foreignField: "wallet_address",
                as: "users_info",
            },
        },
        {
            $unwind: {
                path: "$users_info",
                preserveNullAndEmptyArrays: true, // Make the join optional
            },
        },
        {
            $project: {
                fname_alias: "$user_info.fname_alias",
                lname_alias: "$user_info.lname_alias",
                fname_to_alias: "$users_info.fname_alias",
                lname_to_alias: "$users_info.lname_alias",
                report_from_user_address: "$report_from_user_address",
                report_to_user_address: "$report_to_user_address",
                reason: "$reason",
                created_at: "$created_at",
            },
        },
    ];

    if (
        querySearch &&
        querySearch !== "null" &&
        querySearch !== null &&
        querySearch !== ""
    ) {
        querySearch = querySearch.trim();
        const regexQuery = new RegExp(querySearch);
        reportUsersQuery.push({
            $match: {
                $or: [
                    { fname_alias: { $regex: regexQuery, $options: "i" } },
                    { lname_alias: { $regex: regexQuery, $options: "i" } },
                    { fname_to_alias: { $regex: regexQuery, $options: "i" } },
                    { lname_to_alias: { $regex: regexQuery, $options: "i" } },
                    { reason: { $regex: regexQuery, $options: "i" } },
                ],
            },
        });
    }

    const countResult = await this.reportUserModel.aggregate(reportUsersQuery).count('count');
    // Extract the count from the result
    const count = countResult.length > 0 ? countResult[0].count : 0;
   
    return count;
}


  async getReportUsersById(
    page?: number,
    pageSize?: number,
    user_address?: string,
    querySearch?: any
  ): Promise<any> {
    try {
      let reportUsersQuery: any[] = [
        {
          $match: {
            report_to_user_address: user_address,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "report_from_user_address",
            foreignField: "wallet_address",
            as: "user_info",
          },
        },
        {
          $unwind: {
            path: "$user_info",
            preserveNullAndEmptyArrays: true, // Make the join optional
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "report_to_user_address",
            foreignField: "wallet_address",
            as: "users_info",
          },
        },
        {
          $unwind: {
            path: "$users_info",
            preserveNullAndEmptyArrays: true, // Make the join optional
          },
        },
        {
          $project: {
            fname_alias: "$user_info.fname_alias",
            lname_alias: "$user_info.lname_alias",
            fname_to_alias: "$users_info.fname_alias",
            lname_to_alias: "$users_info.lname_alias",
            report_from_user_address: "$report_from_user_address",
            report_to_user_address: "$report_to_user_address",
            reason: "$reason",
            created_at: "$created_at",
          },
        },
      ];

      if (
        querySearch &&
        querySearch !== "null" &&
        querySearch !== null &&
        querySearch !== ""
      ) {
        querySearch = querySearch.trim();
        const regexQuery = new RegExp(querySearch);
        reportUsersQuery.push({
          $match: {
            $or: [
              { fname_alias: { $regex: regexQuery, $options: "i" } },
              { lname_alias: { $regex: regexQuery, $options: "i" } },
              { fname_to_alias: { $regex: regexQuery, $options: "i" } },
              { lname_to_alias: { $regex: regexQuery, $options: "i" } },
              { reason: { $regex: regexQuery, $options: "i" } },
            ],
          },
        });
      }

      if (page && pageSize) {
        pageSize = Number(pageSize);

        reportUsersQuery.push(
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize }
        );
      }

      const users = await this.reportUserModel.aggregate(reportUsersQuery);

      if (!users) {
        throw new NotFoundException(`Users not found`);
      }
      return users;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getReportUserCountById(user_address?: string) {
    let reportUsersQuery = this.reportUserModel.find({
      report_to_user_address: user_address
    });

    const count = await reportUsersQuery.countDocuments();
    return count;
  }
}
