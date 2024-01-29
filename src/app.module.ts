import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersController } from "./controller/user/users.controller";
import { AuthController } from "./controller/auth/auth.controller";
import { UserSchema } from "./schema/user.schema";
import { UserService } from "./service/user/users.service";
import { AuthenticateMiddleware } from "./middleware/authenticate.middleware";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { MessageSchema } from "./schema/message.schema";
import { TokenService } from "./service/token/token.service";
import { TokenSchema } from "./schema/token.schema";
import { LoginHistorySchema } from "./schema/loginHistory.schema";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { CustomThrottleMiddleware } from "./middleware/custom-throttle.middleware";
import { LoginHistoryService } from "./service/login-history/login-history.service";
import { AdminSchema } from "./schema/admin.schema";
import { AdminService } from "./service/admin/admin.service";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://127.0.0.1:27017/middn"),
    MongooseModule.forFeature([{ name: "user", schema: UserSchema }]),
    MongooseModule.forFeature([{ name: "admin", schema: AdminSchema }]),
    MongooseModule.forFeature([{ name: "message", schema: MessageSchema }]),
    MongooseModule.forFeature([{ name: "token", schema: TokenSchema }]),
    MongooseModule.forFeature([{ name: "login_history", schema: LoginHistorySchema }]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.MIDDN_MAIL_HOST,
        port: process.env.MIDDN_MAIL_PORT,
        auth: {
          user: process.env.MIDDN_MAIL_USER,
          pass: process.env.MIDDN_MAIL_PASSWORD,
        },
      },
      template: {
        dir: join(__dirname, "mails"),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
      defaults: {
        from: process.env.MIDDN_MAIL_FROM_MAIL,
      },
    }),
    ThrottlerModule.forRoot({
      ttl: 5,
      limit: 5,
    }),
  ],
  controllers: [
    AppController,
    UsersController,
    AuthController,
  ],
  providers: [
    AppService,
    UserService,
    TokenService,
    LoginHistoryService,
    AdminService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthenticateMiddleware).forRoutes("/users");
    consumer.apply(CustomThrottleMiddleware).forRoutes(
      "/users/twoFADisableUser/:id",
      "/users/updateUser/:id",
      "/auth/adminlogin",
      "/auth/adminlogout"
    )
  }
}
