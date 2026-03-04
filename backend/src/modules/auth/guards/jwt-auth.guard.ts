/**
 * JWT Auth Guard - protects routes with JWT validation
 * @author: Sahil Sharma
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
