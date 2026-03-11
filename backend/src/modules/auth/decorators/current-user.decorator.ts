/**
 * Current user decorator - extracts user from request
 * @author: Sahil Sharma
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../../users/user.schema';

export const CurrentUser = createParamDecorator(
  <K extends keyof UserDocument>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): UserDocument | UserDocument[K] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDocument;

    if (data !== undefined) {
      return user[data];
    }

    return user;
  },
);
