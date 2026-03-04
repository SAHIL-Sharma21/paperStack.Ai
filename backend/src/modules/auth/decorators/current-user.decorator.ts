/**
 * Current user decorator - extracts user from request
 * @author: Sahil Sharma
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../../users/user.schema';

export const CurrentUser = createParamDecorator(
  (data: keyof UserDocument | undefined, ctx: ExecutionContext): UserDocument | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDocument;

    if (data) {
      return user?.[data] as string;
    }

    return user;
  },
);
