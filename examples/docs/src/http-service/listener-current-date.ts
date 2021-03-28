import { HttpListener, HttpService, jsonOk, passThroughMiddleware, init } from '@ovotech/laminar';

// << listener-current-date
interface CurrentDateContext {
  currentDate: Date;
}

const listenerCurrentDate: HttpListener<CurrentDateContext> = async (ctx) =>
  jsonOk({ message: `${ctx.currentDate} ${ctx.body}` });

const withCurrentDate = passThroughMiddleware<CurrentDateContext>({ currentDate: new Date() });

const service = new HttpService({ listener: withCurrentDate(listenerCurrentDate) });

// listener-current-date

init({ initOrder: [service], logger: console });
