import AdUnit from './adunit';
import Adapter from './adapter';
import Auction from './Auction';
import { strategies } from './Settings';

export default class BidHandler {
  active: boolean;
  adapters: Set<Adapter>;
  adUnits: AdUnit[];
  callbacks: Object;

  constructor() {
    this.active = false;
    this.adapters = new Set();
    this.adUnits = [];
    this.callbacks = {
      onError: [],
      onAuction: [],
    };
  }

  registerAdUnit(adUnit: AdUnit) {
    this.adUnits.push(adUnit);
  }

  requestAds(timeout: number, strategy: number) {
    if (!this.active) {
      throw new Error('Bid handler is not active');
    }

    const context: BidHandler = this;
    const auction: Auction = new Auction(this.adUnits);

    this.adapters.forEach((adapter) => {
      adapter.request(this.adUnits, timeout)
        .then((response) => {
          context.response(adapter, strategy, auction, response);
        })
        .catch((error) => {
          context.error(adapter, strategy, auction, error);
        });
    });
  }

  registerAdapter(adapter: Adapter) {
    this.adapters.add(adapter);
  }

  addCallback(key: String, callback) {
    this.callbacks[key] = this.callbacks[key] || [];
    this.callbacks[key].push(callback);
  }

  response(adapter: Adapter, strategy: number, auction: Auction, resp: Object) {
    if (this.completed) return;
    auction.addResponse(adapter.type, resp);

    this.executeStrategy(auction, strategy);
  }

  error(adapter: Adapter, strategy: number, auction: Auction, error: Error) {
    auction.addError(adapter.type, error);
    this.callbacks.onError
      .forEach(callback => callback.call(callback, adapter.type, error));

    this.executeStrategy(auction, strategy);
  }

  executeStrategy(auction: Auction, strategy: number) {
    switch (strategy) {
      case strategies.ON_FIRST_RESPONSE:
        this.complete(auction);
        return;
      case strategies.ON_EVERY_RESPONSE:
        this.deliver(auction);
        return;
      default:
        if (Object.keys(auction.result).length
          + Object.keys(auction.errors).length === this.adapters.size) {
          this.complete(auction);
        }
    }
  }

  complete(auction: Auction) {
    auction.complete();
    this.deliver(auction);
  }

  deliver(auction: Auction) {
    if (auction.completed) {
      return;
    }

    if (typeof this.callbacks.onAuction !== 'undefined') {
      this.callbacks.onAuction
        .forEach(callback => callback.call(auction, auction));
    }
  }
}
