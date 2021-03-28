import { HttpContext, HttpResponse, HttpService, jsonOk, init } from '@ovotech/laminar';

// << listener-simple
const simpleListener = async (ctx: HttpContext): Promise<HttpResponse> => {
  return jsonOk({ message: ctx.body });
};

const service = new HttpService({ listener: simpleListener });
// listener-simple

init({ initOrder: [service], logger: console });
