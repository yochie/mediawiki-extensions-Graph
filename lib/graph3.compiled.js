(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
( function ( $, mw, vg ) {

	'use strict';
	/* global require */

	var VegaWrapper = require( 'yochie-mw-graph-shared' ),

		// eslint-disable-next-line no-new
		wrappedVega = new VegaWrapper( {
			data: {
				extend: vg.extend,
				loader: vg.loader,
				http: vg.loader().http
			},
			isTrusted: mw.config.get( 'wgGraphIsTrusted' ),
			domains: mw.config.get( 'wgGraphAllowedDomains' ),
			domainMap: false,
			logger: function ( warning ) {
				mw.log.warn( warning );
			},
			parseUrl: function ( url ) {
				// Parse URL
				var uri = new mw.Uri( url );

				// reduce confusion, only keep expected values
				if ( uri.port ) {
					uri.host += ':' + uri.port;
					delete uri.port;
				}
				// If url begins with   protocol:///...  mark it as having relative host
				if ( /^[a-z]+:\/\/\//.test( url ) ) {
					uri.isRelativeHost = true;
				}
				if ( uri.protocol ) {
					// All other libs use trailing colon in the protocol field
					uri.protocol += ':';
				}
				// Node's path includes the query, whereas pathname is without the query
				// Standardizing on pathname
				uri.pathname = uri.path;
				delete uri.path;
				return uri;
			},
			formatUrl: function ( uri, opt ) {
				// Format URL back into a string
				// Revert path into pathname
				uri.path = uri.pathname;
				delete uri.pathname;

				if ( location.host.toLowerCase() === uri.host.toLowerCase() ) {
					if ( !mw.config.get( 'wgGraphIsTrusted' ) ) {
						// Only send this header when hostname is the same.
						// This is broader than the same-origin policy,
						// but playing on the safer side.
						opt.headers = { 'Treat-as-Untrusted': 1 };
					}
				} else if ( opt.addCorsOrigin ) {
					// All CORS api calls require origin parameter.
					// It would be better to use location.origin,
					// but apparently it's not universal yet.
					uri.query.origin = location.protocol + '//' + location.host;
				}

				uri.protocol = VegaWrapper.removeColon( uri.protocol );
				return uri.toString();
			},
			languageCode: mw.config.get( 'wgUserLanguage' )
		} );

	/**
	 * Set up drawing canvas inside the given element and draw graph data
	 * @param {HTMLElement} element
	 * @param {Object|string} data graph spec
	 */
	mw.drawVegaGraph = function ( element, data ) {

		function render( spec ) {
			new vg.View( vg.parse( spec ), { loader: wrappedVega.data.loader() } )
				.renderer( 'svg' )
				.initialize( element )
				.hover()
				.run();
		}
		render( data );
	};

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var specs = mw.config.get( 'wgGraphSpecs' );
		if ( !specs ) {
			return;
		}
		$content.find( '.mw-graph.mw-graph-always' ).each( function () {
			var graphId = $( this ).data( 'graph-id' );
			if ( !specs.hasOwnProperty( graphId ) ) {
				mw.log.warn( graphId );
			} else {
				mw.drawVegaGraph( this, specs[ graphId ] );
			}
		} );
	} );

}( jQuery, mediaWiki, vega ) );

},{"yochie-mw-graph-shared":4}],2:[function(require,module,exports){
'use strict';

/**
 * Convert a list of domains into an object with a test method.
 *   equivalent regex: (any-subdomain)\.(wikipedia\.org|wikivoyage\.org|...)
 *
 * @param domains array of string domains
 * @param allowSubdomains if true, allows any sub and sub-sub-* domains
 * @returns {*}
 */
module.exports = function makeValidator(domains, allowSubdomains) {
    if (!domains || domains.length === 0) return {
        // Optimization - always return false
        test: function () {
            return false;
        }
    };
    return new RegExp(
        (allowSubdomains ? '^([^@/:]*\\.)?(' : '^(') +
        domains
            .map(function (s) {
                return s.replace('.', '\\.');
            })
            .join('|') + ')$', 'i');
};

},{}],3:[function(require,module,exports){
'use strict';
/* global module */

module.exports = parseWikidataValue;

/**
 * Given a value object as returned from Wikidata Query Service, returns a simplified value
 * @param {object} value Original object as sent by the Wikidata query service
 * @param {string} value.type SPARQL data type (literal, uri)
 * @param {string} value.datatype XMLSchema data type
 * @param {*} value.value The actual value sent by the Wikidata query service
 * @param {boolean=} ignoreUnknown if false, will return value.value even if it cannot be recognized
 * @return {*}
 */
function parseWikidataValue(value, ignoreUnknown) {
    var temp;

    if (!value || !value.type || value.value === undefined) {
        return undefined;
    }

    switch (value.type) {
        case 'literal':
            switch (value.datatype) {
                case 'http://www.w3.org/2001/XMLSchema#double':
                case 'http://www.w3.org/2001/XMLSchema#float':
                case 'http://www.w3.org/2001/XMLSchema#decimal':
                case 'http://www.w3.org/2001/XMLSchema#integer':
                case 'http://www.w3.org/2001/XMLSchema#long':
                case 'http://www.w3.org/2001/XMLSchema#int':
                case 'http://www.w3.org/2001/XMLSchema#short':
                case 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger':
                case 'http://www.w3.org/2001/XMLSchema#positiveInteger':
                case 'http://www.w3.org/2001/XMLSchema#unsignedLong':
                case 'http://www.w3.org/2001/XMLSchema#unsignedInt':
                case 'http://www.w3.org/2001/XMLSchema#unsignedShort':
                case 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger':
                case 'http://www.w3.org/2001/XMLSchema#negativeInteger':
                    temp = parseFloat(value.value);
                    if (temp.toString() === value.value) {
                        // use number only if it is fully round-tripable back to string
                        // TBD: this might be overcautios, and would cause more problems than solve
                        return temp;
                    }
                    break;
                case 'http://www.opengis.net/ont/geosparql#wktLiteral':
                    // Point(-64.2 -36.62)  -- (longitude latitude)
                    temp = /^Point\(([-0-9.]+) ([-0-9.]+)\)$/.exec(value.value);
                    if (temp) {
                        return [parseFloat(temp[1]), parseFloat(temp[2])];
                    }
                    break;
            }
            break;
        case 'uri':
            // "http://www.wikidata.org/entity/Q12345"  ->  "Q12345"
            temp = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/.exec(value.value);
            if (temp) {
                return temp[1];
            }
            break;
    }
    return ignoreUnknown ? undefined : value.value;
}


},{}],4:[function(require,module,exports){
'use strict';
/* global module */

var makeValidator = require('domain-validator'),
parseWikidataValue = require('wd-type-parser');

module.exports = VegaWrapper;
module.exports.removeColon = removeColon;

/**
 * Utility function to remove trailing colon from a protocol
 * @param {string} protocol
 * @return {string}
 */
 function removeColon(protocol) {
    return protocol && protocol.length && protocol[protocol.length - 1] === ':'
    ? protocol.substring(0, protocol.length - 1) : protocol;
}

/**
 * Shared library to wrap around vega code
 * @param {Object} wrapperOpts Configuration options
 * @param {Object} wrapperOpts.data Vega's data object
 * @param {Function} wrapperOpts.data.loader Vega's data loader function
 * @param {Function} wrapperOpts.data.loader.http Vega's http request function
 * @param {Function} wrapperOpts.data.extend similar to jquery's extend()
 * @param {boolean} wrapperOpts.useXhr true if we should use XHR, false for node.js http loading
 * @param {boolean} wrapperOpts.isTrusted true if the grapsh spec can be trusted
 * @param {Object} wrapperOpts.domains allowed protocols and a list of their domains
 * @param {Object} wrapperOpts.domainMap domain remapping
 * @param {Function} wrapperOpts.logger
 * @param {Function} wrapperOpts.parseUrl
 * @param {Function} wrapperOpts.formatUrl
 * @param {string} [wrapperOpts.languageCode]
 * @constructor
 */
 function VegaWrapper(wrapperOpts) {

    var self = this;
    
    // Copy all options into this object
    self.objExtender = wrapperOpts.data.extend;
    self.objExtender(self, wrapperOpts);
    self.validators = {};

    self.data.loader = function(options) {
        return {
            options: options || {},
            sanitize: self.sanitize.bind(self),
            load: function (url, opt) {
                var loader = this;
                return loader.sanitize(url, opt)
                    .then(function(opt2) {
                        var url2 = opt2.href; 
                        return loader.http(url2, opt)
                                .then(function (rawData){
                                    return self.dataParser(rawData, opt);
                                });
                    });  
            },
            file: alwaysFail,
            http: self.data.http
        };
    }
}

/**
 * Check if host was listed in the allowed domains, normalize it, and get correct protocol
 * @param {string} host
 * @returns {Object}
 */
 VegaWrapper.prototype.sanitizeHost = function sanitizeHost(host) {
    // First, map the host
    host = (this.domainMap && this.domainMap[host]) || host;

    if (this.testHost('https:', host)) {
        return {host: host, protocol: 'https:'};
    } else if (this.testHost('http:', host)) {
        return {host: host, protocol: 'http:'};
    }
    return undefined;
};

/**
 * Test host against the list of allowed domains based on the protocol
 * @param {string} protocol
 * @param {string} host
 * @returns {boolean}
 */
 VegaWrapper.prototype.testHost = function testHost(protocol, host) {
    if (!this.validators[protocol]) {
        var domains = this._getProtocolDomains(protocol);
        if (domains) {
            this.validators[protocol] = makeValidator(domains, protocol === 'https:' || protocol === 'http:');
        } else {
            return false;
        }
    }
    return this.validators[protocol].test(host);
};

/**
 * Gets allowed domains for a given protocol.  Assumes protocol ends with a ':'.
 * Handles if this.domains's keys do not end in the ':'.
 * @param {string} protocol
 * @return {[]|false}
 * @private
 */
 VegaWrapper.prototype._getProtocolDomains = function _getProtocolDomains(protocol) {
    return this.domains[protocol] || this.domains[removeColon(protocol)];
};


/**
 * Validate and update urlObj to be safe for client-side and server-side usage
 * @param {Object} opt passed by the vega loader, and will add 'graphProtocol' param
 * @returns {Promise} that evaluates to sanitized url
 */
 VegaWrapper.prototype.sanitize = function sanitize(url, opt) {
    var self = this;
    return new Promise(function(accept, reject) {
        var result = {href: null};
        if (url == null || typeof url !== 'string') {
            reject('Sanitize failure, invalid URL: ' + $(url));
            return;
        }

        // In some cases we may receive a badly formed URL in a form   customprotocol:https://...
        url = url.replace(/^([a-z]+:)https?:\/\//, '$1//');

        
        var decodedPathname,
        isRelativeProtocol = /^\/\//.test(url);
        var urlParts = self.parseUrl(url, opt);
        var sanitizedHost = self.sanitizeHost(urlParts.host);

        if (!sanitizedHost) {
            reject('URL hostname is not whitelisted: ' + $(url));
            return;
        }

        urlParts.host = sanitizedHost.host;
        if (!urlParts.protocol) {
            // node.js mode only - browser's url parser will always set protocol to current one
            // Update protocol-relative URLs
            urlParts.protocol = sanitizedHost.protocol;
            isRelativeProtocol = true;
        }

        // Save original protocol to post-process the data
        opt.graphProtocol = urlParts.protocol;

        //TODO: opt.type isn't used in vega 3. Still need to figure out when open type was used and 
        //adjust this section accordingly.
        if (opt.type === 'open') {

            // Trim the value here because mediawiki will do it anyway, so we might as well save on redirect
            decodedPathname = decodeURIComponent(urlParts.pathname).trim();

            switch (urlParts.protocol) {
                case 'http:':
                case 'https:':
                        // The default protocol for the open action is wikititle, so if isRelativeProtocol is set,
                        // we treat the whole pathname as title (without the '/' prefix).
                        if (!isRelativeProtocol) {
                            // If we get http:// and https:// protocol hardcoded, remove the '/wiki/' prefix instead
                            if (!/^\/wiki\/.+$/.test(decodedPathname)) {
                                reject('wikititle: http(s) links must begin with /wiki/ prefix');
                                return;
                            }
                            decodedPathname = decodedPathname.substring('/wiki'.length);
                        }

                        opt.graphProtocol = 'wikititle';
                        // fall-through

                    case 'wikititle:':
                    // wikititle:///My_page   or   wikititle://en.wikipedia.org/My_page
                    // open() at this point may only be used to link to a Wiki page, as it may be invoked
                    // without a click, thus potentially causing a privacy issue.
                    if (Object.keys(urlParts.query).length !== 0) {
                        reject('wikititle: query parameters are not allowed');
                        return
                    }
                    if (!/^\/[^|]+$/.test(decodedPathname)) {
                        reject('wikititle: invalid title');
                        return;
                    }
                    urlParts.pathname = '/wiki/' + encodeURIComponent(decodedPathname.substring(1).replace(' ', '_'));
                    urlParts.protocol = sanitizedHost.protocol;
                    break;

                    default:
                    reject('"open()" action only allows links with wikititle protocol, e.g. wikititle:///My_page');
                    return;
            }
        } else {

                //TODO:https and wikiraw tested, still need to test all other protocols.
                //In the meantime, adding console message and failing if other protocols are used.
              	if(urlParts.protocol !== "http:" && urlParts.protocol !== "https:" && urlParts.protocol !== "wikiraw:"){
                	console.log("Only http, https and wikiraw are supported for vega 3 graphs. Use vega 2 to use those protocols.");
                	reject("Only http, https and wikiraw are supported for vega 3 graphs. Use vega 2 to use those protocols.");
                }
                
                switch (urlParts.protocol) {
                    case 'http:':
                    case 'https:':
                    if (!self.isTrusted) {
                        reject('HTTP and HTTPS protocols are not supported for untrusted graphs.\n' +
                            'Use wikiraw:, wikiapi:, wikirest:, wikirawupload:, and other protocols.\n' +
                            'See https://www.mediawiki.org/wiki/Extension:Graph#External_data');
                        return;
                    }
                // keep the original URL
                break;

                case 'wikiapi:':
                // wikiapi:///?action=query&list=allpages
                // Call to api.php - ignores the path parameter, and only uses the query
                urlParts.query = self.objExtender(urlParts.query, {format: 'json', formatversion: '2'});
                urlParts.pathname = '/mediawiki/api.php';
                urlParts.protocol = sanitizedHost.protocol;
                opt.addCorsOrigin = true;
                break;

                case 'wikirest:':
                // wikirest:///api/rest_v1/page/...
                // Call to RESTbase api - requires the path to start with "/api/"
                // The /api/... path is safe for GET requests
                if (!/^\/api\//.test(urlParts.pathname)) {
                    reject('wikirest: protocol must begin with the /api/ prefix');
                    return;
                }
                // keep urlParts.query
                // keep urlParts.pathname
                urlParts.protocol = sanitizedHost.protocol;
                break;

                case 'wikiraw:':
                case 'tabular:':
                case 'map:':
                // wikiraw:///MyPage/data
                // Get content of a wiki page, where the path is the title
                // of the page with an additional leading '/' which gets removed.
                // Uses mediawiki api, and extract the content after the request
                // Query value must be a valid MediaWiki title string, but we only ensure
                // there is no pipe symbol, the rest is handled by the api.
                decodedPathname = decodeURIComponent(urlParts.pathname);
                if (!/^\/[^|]+$/.test(decodedPathname)) {
                    reject(urlParts.protocol + ' invalid title');
                    return;
                }
                if (urlParts.protocol === 'wikiraw:') {
                    urlParts.query = {
                        format: 'json',
                        formatversion: '2',
                        action: 'query',
                        prop: 'revisions',
                        rvprop: 'content',
                        titles: decodedPathname.substring(1)
                    };
                } else {
                    urlParts.query = {
                        format: 'json',
                        formatversion: '2',
                        action: 'jsondata',
                        title: decodedPathname.substring(1)
                    };
                    if (urlParts.siteLanguage || self.languageCode) {
                        urlParts.query.uselang = urlParts.siteLanguage || self.languageCode;
                    }
                }
                //TODO: move this url to config var (or get it from already existing config)
                //Right now this is hardcoded for the api url on my (yoann) dev system. 
                //It used to be "/w/api.php".
                urlParts.pathname = '/mediawiki/api.php';
                urlParts.protocol = sanitizedHost.protocol;
                opt.addCorsOrigin = true;
                break;

                case 'wikifile:':
                // wikifile:///Einstein_1921.jpg
                // Get an image for the graph, e.g. from commons, by using Special:Redirect
                urlParts.pathname = '/wiki/Special:Redirect/file' + urlParts.pathname;
                urlParts.protocol = sanitizedHost.protocol;
                // keep urlParts.query
                break;

                case 'wikirawupload:':
                // wikirawupload://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921.jpg
                // Get an image for the graph, e.g. from commons
                // This tag specifies any content from the uploads.* domain, without query params
                self._validateExternalService(urlParts, sanitizedHost, url);
                urlParts.query = {};
                // keep urlParts.pathname
                break;

                case 'wikidatasparql:':
                // wikidatasparql:///?query=<QUERY>
                // Runs a SPARQL query, converting it to
                // https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=...
                self._validateExternalService(urlParts, sanitizedHost, url);
                if (!urlParts.query || !urlParts.query.query) {
                    reject('wikidatasparql: missing query parameter in: ' + url);
                    return;
                }
                // Only keep the "query" parameter
                urlParts.query = {query: urlParts.query.query};
                urlParts.pathname = '/bigdata/namespace/wdq/sparql';
                opt.headers = self.objExtender(opt.headers || {}, {'Accept': 'application/sparql-results+json'});
                break;

                case 'geoshape:':
                case 'geoline:':
                // geoshape:///?ids=Q16,Q30  or  geoshape:///?query=...
                // Get geoshapes data from OSM database by supplying Wikidata IDs
                // https://maps.wikimedia.org/shape?ids=Q16,Q30
                // 'geoline:' is an identical service, except that it returns lines instead of polygons
                self._validateExternalService(urlParts, sanitizedHost, url, 'geoshape:');
                if (!urlParts.query || (!urlParts.query.ids && !urlParts.query.query)) {
                    reject(opt.graphProtocol + ' missing ids or query parameter in: ' + url);
                    return;
                }
                // the query object is not modified
                urlParts.pathname = '/' + removeColon(opt.graphProtocol);
                break;

                case 'mapsnapshot:':
                // mapsnapshot:///?width=__&height=__&zoom=__&lat=__&lon=__ [&style=__]
                // Converts it into a snapshot image request for Kartotherian:
                // https://maps.wikimedia.org/img/{style},{zoom},{lat},{lon},{width}x{height}[@{scale}x].{format}
                // (scale will be set to 2, and format to png)
                if (!urlParts.query) {
                    reject('mapsnapshot: missing required parameters');
                    return;
                }
                validate(urlParts, 'width', 1, 4096);
                validate(urlParts, 'height', 1, 4096);
                validate(urlParts, 'zoom', 0, 22);
                validate(urlParts, 'lat', -90, 90, true);
                validate(urlParts, 'lon', -180, 180, true);

                var query = urlParts.query;
                if (query.style && !/^[-_0-9a-z]+$/.test(query.style)) {
                    reject('mapsnapshot: if style is given, it must be letters/numbers/dash/underscores only');
                    return;
                }

                // Uses the same configuration as geoshape service, so reuse settings
                self._validateExternalService(urlParts, sanitizedHost, url, 'geoshape:');

                urlParts.pathname = '/img/' + (query.style || 'osm-intl') + ',' + query.zoom + ',' +
                query.lat + ',' + query.lon + ',' + query.width + 'x' + query.height + '@2x.png';
                urlParts.query = {}; // deleting it would cause errors in mw.Uri()
                break;

                default:
                reject('Unknown protocol ' + url);
                return;
            }
        }
        let toreturn = {href: self.formatUrl(urlParts, opt)};
        accept(toreturn);
        return;
    });
}

function validate(urlParts, name, min, max, isFloat) {
    var value = urlParts.query[name];
    if (value === undefined) {
        throw new Error(urlParts.protocol + ' parameter ' + name + ' is not set');
    }
    if (!(isFloat ? /^-?[0-9]+\.?[0-9]*$/ : /^-?[0-9]+$/).test(value)) {
        throw new Error(urlParts.protocol + ' parameter ' + name + ' is not a number');
    }
    value = isFloat ? parseFloat(value) : parseInt(value);
    if (value < min || value > max) {
        throw new Error(urlParts.protocol + ' parameter ' + name + ' is not valid');
    }
}

VegaWrapper.prototype._validateExternalService = function _validateExternalService(urlParts, sanitizedHost, url, protocolOverride) {
    var protocol = protocolOverride || urlParts.protocol,
    domains = this._getProtocolDomains(protocol);
    if (!domains) {
        throw new Error(protocol + ': protocol is disabled: ' + url);
    }
    if (urlParts.isRelativeHost) {
        urlParts.host = domains[0];
        urlParts.protocol = this.sanitizeHost(urlParts.host).protocol;
    } else {
        urlParts.protocol = sanitizedHost.protocol;
    }
    if (!this.testHost(protocol, urlParts.host)) {
        throw new Error(protocol + ': URL must either be relative (' + protocol + '///...), or use one of the allowed hosts: ' + url);
    }
};

/**
 * Performs post-processing of the data requested by the graph's spec
 */
VegaWrapper.prototype.dataParser = function dataParser(data, opt) {
    var self = this;
    return new Promise(function (accept, reject){
        try {
            data = self.parseDataOrThrow(data, opt);
        } catch (e) {
            var error = e;
            data = undefined;
            reject(error);
            
        }
        accept(data);
    });
};

/**
 * Parses the response from MW Api, throwing an error or logging warnings
 */
 VegaWrapper.prototype.parseMWApiResponse = function parseMWApiResponse(data) {
    data = JSON.parse(data);
    if (data.error) {
        throw new Error('API error: ' + JSON.stringify(data.error));
    }
    if (data.warnings) {
        this.logger('API warnings: ' + JSON.stringify(data.warnings));
    }
    return data;
};

/**
 * Performs post-processing of the data requested by the graph's spec, and throw on error
 */
 VegaWrapper.prototype.parseDataOrThrow = function parseDataOrThrow(data, opt) {

    switch (opt.graphProtocol) {
        case 'wikiapi:':
        data = this.parseMWApiResponse(data);
        break;
        case 'wikiraw:':
        data = this.parseMWApiResponse(data);
        try {
            data = data.query.pages[0].revisions[0].content;
        } catch (e) {
            throw new Error('Page content not available ' + url);
        }
        break;
        case 'tabular:':
        case 'map:':
        data = this.parseMWApiResponse(data).jsondata;
        var metadata = [{
            description: data.description,
            license_code: data.license.code,
            license_text: data.license.text,
            license_url: data.license.url,
            sources: data.sources
        }];
        if (opt.graphProtocol === 'tabular:') {
            var fields = data.schema.fields.map(function (v) {
                return v.name;
            });
            data = {
                meta: metadata,
                fields: data.schema.fields,
                data: data.data.map(function (v) {
                    var row = {}, i;
                    for (i = 0; i < fields.length; i++) {
                            // Need to copy nulls too -- Vega has no easy way to test for undefined
                            row[fields[i]] = v[i];
                        }
                        return row;
                    })
            }
        } else {
            metadata[0].zoom = data.zoom;
            metadata[0].latitude = data.latitude;
            metadata[0].longitude = data.longitude;
            data = {
                meta: metadata,
                data: data.data
            };
        }
        break;
        case 'wikidatasparql:':
        data = JSON.parse(data);
        if (!data.results || !Array.isArray(data.results.bindings)) {
            throw new Error('SPARQL query result does not have "results.bindings"');
        }
        data = data.results.bindings.map(function (row) {
            var key, result = {};
            for (key in row) {
                if (row.hasOwnProperty(key)) {
                    result[key] = parseWikidataValue(row[key]);
                }
            }
            return result;
        });
        break;
    }
    return data;
};

/**
 * Throw an error when called
 */
 function alwaysFail() {
    throw new Error('Disabled');
}

},{"domain-validator":2,"wd-type-parser":3}]},{},[1]);
