window._SwaarmSdk = {
    initialize: function (trackingUrl,
                          token,
                          initCallback = null,
                          attributionCallback = null,
                          flushFrequency = 2,
                          debug = false) {
        if (trackingUrl == null || !trackingUrl.startsWith("http")) {
            throw new Error("Invalid tracking url received: " + trackingUrl)
        }
        if (trackingUrl.slice(-1) !== '/') {
            trackingUrl = trackingUrl + '/';
        }
        this.trackingUrl = trackingUrl
        this.token = token;
        this.attributionCallback = attributionCallback;
        this.flushFrequency = flushFrequency;
        this.debug = debug;
        this.events = [];
        this.queryParams = this._getQueryParams();
        this.idfv = this._initializeIdfv();
        this._getClickId(clickId => {
            this.clickId = clickId;
            localStorage.setItem("SWAARM_CLICK_ID", clickId);
            this.attributionData = this._readAttributionDataFromStorage();
            this._checkAndFetchAttributionDataPeriodically();
            this.initialized = true;
            this._start();
            if (initCallback) {
                initCallback();
            }
        });
    },

    land: function () {
        if (!this.initialized) {
            throw new Error("SDK not initialized");
        }
        if (this._isFirstRun()) {
            this._addEvent(null, this.clickId);
        }
        this._addEvent('__open');
    },

    _start: function () {
        if (!this.initialized) {
            throw new Error("SDK not initialized");
        }
        this._sendEvents();
        if (this.flushFrequency > 0) {
            setInterval(this._sendEvents, this.flushFrequency * 1000);
        }
    },

    _sendEvents: function () {
        if (!this.initialized) {
            throw new Error("SDK not initialized");
        }
        try {
            this._log("Checking for events to send: " + this.events.length);
            if (this.events.length > 0) {
                const eventsSlice = this.events.slice();
                const payload = JSON.stringify({
                    time: new Date().toISOString(),
                    events: eventsSlice
                });
                this._log("Sending events: " + payload);
                const xhr = new XMLHttpRequest();
                const self = this;
                xhr.open("POST", this.trackingUrl + "sdk", true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || xhr.status === 201) {
                            self._log("Events sent successfully:", xhr.responseText);
                            for (let i = self.events.length - 1; i >= 0; i--) {
                                if (eventsSlice.includes(self.events[i])) {
                                    self.events.splice(i, 1);
                                }
                            }
                        } else {
                            console.error("Failed to send events:", xhr.status, xhr.responseText);
                        }
                    }
                };
                xhr.send(payload);
            }
        } catch (e) {
            console.error("Failed to send events", e);
        }
    },

    _readAttributionDataFromStorage: function() {
        const attributionDataString = localStorage.getItem("SWAARM_ATTRIBUTION_DATA");
        if (!attributionDataString) {
            return undefined;
        }
        return JSON.parse(attributionDataString);
    },

    _getClickId: function (callback) {
        if (this.queryParams.swaarm_clickid) {
            callback(this.queryParams.swaarm_clickid);
            return;
        }
        const localStorageClickId = localStorage.getItem("SWAARM_CLICK_ID");
        if (localStorageClickId) {
            callback(localStorageClickId);
            return;
        }
        this._sendRequest(this.trackingUrl + "/utm_click?" + this._collectUtmData(),
            callback, false, () => callback(undefined));
    },

    _initializeIdfv: function () {
        const existingIdvf = localStorage.getItem("SWAARM_SDK_ID");
        if (existingIdvf) {
            return existingIdvf;
        }
        const newIdfv = this._generateUUID();
        localStorage.setItem("SWAARM_SDK_ID", newIdfv);
        return newIdfv;
    },

    _isFirstRun: function () {
        const firstRun = localStorage.getItem("SWAARM_SDK_SEEN_FLAG") == null;
        if (firstRun) {
            localStorage.setItem("SWAARM_SDK_SEEN_FLAG", true);
        }
        return firstRun;
    },

    _generateUUID: function () {
        const lut = [];
        for (let i = 0; i < 256; i++) {
            lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
        }
        const d0 = Math.random() * 0xffffffff | 0;
        const d1 = Math.random() * 0xffffffff | 0;
        const d2 = Math.random() * 0xffffffff | 0;
        const d3 = Math.random() * 0xffffffff | 0;
        return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
            lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
            lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
            lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
    },

    _addEvent: function (typeId, clickId = null, aggregatedValue = 0, customValue = '', revenue = 0, currency = null) {
        this.events.push({
            id: this._generateUUID(),
            typeId,
            aggregatedValue,
            customValue,
            revenue,
            currency,
            vendorId: this.idfv,
            clientTime: new Date().toISOString(),
            clickId
        });
    },

    _getQueryParams: function () {
        const qs = window.location.search.split('+').join(' ');
        const params = {};
        const re = /[?&]?([^=]+)=([^&]*)/g;
        let tokens;
        while (tokens = re.exec(qs)) {
            if (tokens.length >= 3) {
                params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
            }
        }
        return params;
    },

    _sendRequest: function (url, successCallback, parseData = false, failCallback = null) {
        this._log("Requesting " + url)
        const req = new XMLHttpRequest();
        const self = this;
        req.addEventListener("load", function () {
            self._log("Request to " + url + " sent successfully.");
        });
        req.onreadystatechange = function (event) {
            if (req.readyState === 4) {
                self._log("Response status " + req.status);
                if (req.status === 200) {
                    self._log("Response body " + req.responseText);
                    let data = req.responseText;
                    if (parseData === true) {
                        data = JSON.parse(req.responseText);
                    }
                    if (successCallback) {
                        successCallback(data);
                    }
                } else if (failCallback) {
                    failCallback();
                }
            }
        }
        req.open("GET", url);
        req.send();
    },

    _log: function (message) {
        if (!this.debug) {
            return;
        }
        console.log("[SWAARM#SDK] " + message);
    },

    _collectUtmData: function () {
        const params = this._getQueryParams();
        const parts = [];
        if (params.utm_campaign) {
            parts.push("campaign=" + params.utm_campaign)
        }
        if (params.utm_adset) {
            parts.push("adset=" + params.utm_adset)
        }
        if (params.utm_ad) {
            parts.push("ad=" + params.utm_ad)
        }
        if (params.utm_source) {
            parts.push("site=" + params.utm_source)
        }
        if (params.utm_term) {
            parts.push("term=" + params.utm_term)
        }
        if (params.swcid) {
            parts.push("campaign_id=" + params.swcid)
        }
        if (params.swasid) {
            parts.push("adset_id=" + params.swasid)
        }
        if (params.swaid) {
            parts.push("ad_id=" + params.swasid)
        }
        if (params.swc) {
            parts.push("campaign_id=" + params.swc)
        }
        if (params.swas) {
            parts.push("adset_id=" + params.swas)
        }
        if (params.swa) {
            parts.push("ad_id=" + params.swa)
        }
        if (params.gclid) {
            parts.push("pub_click_id=" + params.gclid)
        }
        if (params.fbclid) {
            parts.push("pub_click_id=" + params.fbclid)
        }
        if (params.ttclid) {
            parts.push("pub_click_id=" + params.ttclid)
        }
        return parts.join("&")
    },

    _checkAndFetchAttributionDataPeriodically: function () {
        let backoffInterval = this.flushFrequency * 1000;
        const exponent = 1.5;
        const self = this;

        const fetchWithExponentialBackoff = () => {
            if (!self.attributionData || !self.attributionData.decision) {
                self.attributionTimer = setTimeout(() => {
                    self._fetchAttributionData();

                    if (self.attributionData && self.attributionData.decision) {
                        clearTimeout(self.attributionTimer);
                        self.attributionTimer = null;
                    } else {
                        backoffInterval = Math.round(1000 * Math.pow(backoffInterval / 1000, exponent));
                        self._log(`Attribution data backoff interval: ${backoffInterval} ms`);
                        fetchWithExponentialBackoff();
                    }
                }, backoffInterval);
            }
        };
        fetchWithExponentialBackoff();
    },

    _fetchAttributionData: function() {
        try {
            const url = new URL(this.trackingUrl + '/attribution-data');
            url.searchParams.append("vendorId", this.idfv);
            this._log(`Fetching attribution data from ${url}`);

            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);

            const self = this;

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        const body = xhr.responseText;
                        self._log(`Fetched attribution data from server: ${body}`);
                        self.attributionData = JSON.parse(body);

                        if (self.attributionData?.decision && self.attributionCallback) {
                            try {
                                self._log("Calling attribution callback");
                                self.attributionCallback(self.attributionData);
                            } catch (error) {
                                console.error("Error in attribution callback:", error);
                            }
                        }
                        localStorage.setItem("SWAARM_ATTRIBUTION_DATA", body);
                    } else {
                        console.error(`Failed to fetch attribution data: ${xhr.status}`);
                    }
                }
            };
            xhr.send();
        } catch (error) {
            console.error("Exception while fetching attribution data:", error);
        }
    },

    _associateUserId: function(userId) {
        const url = new URL(this.trackingUrl + '/asscoiate-user');
        url.searchParams.append("idfv", this.idfv);
        url.searchParams.append("user_id", userId);
        this._log(`Associating ${userId} with ${this.idfv}`);

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
        xhr.send();
    }
}

window.SwaarmSdk = {
    initialize: function (trackingUrl,
                          token,
                          initCallback = null,
                          attributionCallback = null,
                          flushFrequency = 2,
                          debug = false) {
        window._SwaarmSdk.initialize(trackingUrl, token, initCallback, attributionCallback, flushFrequency, debug);
    },

    land: function () {
        window._SwaarmSdk.land();
    },

    getAttributionData: function () {
        return window._SwaarmSdk.getAttributionData();
    },

    event: function (typeId, aggregatedValue = 0, customValue = '', revenue = 0, currency = null) {
        window._SwaarmSdk._addEvent(typeId, null, aggregatedValue, customValue, revenue, currency);
    },

    associateUserId: function(userId) {
        window._SwaarmSdk.associateUserId(userId);
    }
}
