import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { Readable } from 'stream';

export interface Request {
  incommingMessage: IncomingMessage;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Empty = {};

export type ResponseBody = Readable | Buffer | string;

export interface Response<Content = unknown, Status = number> {
  body: Content;
  status: Status;
  headers: OutgoingHttpHeaders;
}

export type Resolver<TReq extends Request = Request> = (req: TReq) => Response | Promise<Response>;

export type Component<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
  TInherit extends Request = Request
>(
  next: Resolver<TProvide & TRequire & TInherit>,
) => Resolver<TRequire & TInherit>;
