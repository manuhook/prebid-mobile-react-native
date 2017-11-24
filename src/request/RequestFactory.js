import Geo from './Geo';
import Request from './Request';

export default class RequestFactory {
  strategies: {[String]: (Request) => mixed};

  constructor() {
    this.strategies = {};
  }

  addCustomHandler(
    adapterType: String,
    handler: (request: Request, geo: Geo) => mixed,
  ) {
    this.strategies[adapterType] = handler;
  }

  static baseRequest(): Request {
    return new Request();
  }

  request(adapterType: String, buildRequestTimeout: number): Promise<Request> {
    const req = RequestFactory.baseRequest();
    const handler = this.strategies[adapterType];
    let promise: Promise<Request>;

    if (typeof handler !== 'undefined') {
      promise = new Promise((resolve, reject) => {
        handler.call(this, req, resolve.bind(req, req));
        const rejectCallback = reject.bind(
          'request build timeout',
          'request build timeout',
        );
        setInterval(rejectCallback, buildRequestTimeout);
      }).catch((error) => {
        console.error(error);
      });
    } else {
      promise = new Promise((resolve) => {
        resolve(req);
      });
    }

    return promise;
  }
}
