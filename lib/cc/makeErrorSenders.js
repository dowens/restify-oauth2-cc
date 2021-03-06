var restify = require("restify");

var statusCodesToErrorCodes = {
    400: "BadRequest",
    401: "invalid_token"
};

module.exports = function makeErrorSenders(grantTypes) {
    function setLinkHeader(res, options) {
        res.header("Link",
            "<" + options.endpoint + ">; rel=\"oauth2-token\"; " +
            "grant-types=\"" + grantTypes + "\"; token-types=\"bearer\"");
    }

    function setWwwAuthenticateHeader(res, options, error) {
        res.header("WWW-Authenticate",
            "Bearer realm=\"" + options.realm + "\", " +
            "error=\"" + statusCodesToErrorCodes[error.statusCode] + "\", " +
            "message=\"" + error.message + "\"");
    }

    function setWwwAuthenticateHeaderWithoutErrorInfo(res, options) {
        // See http://tools.ietf.org/html/rfc6750#section-3.1: "If the request lacks any authentication information
        // (e.g., the client was unaware that authentication is necessary or attempted using an unsupported
        // authentication method), the resource server SHOULD NOT include an error code or other error information."
        res.header("WWW-Authenticate", "Bearer realm=\"" + options.realm + "\"");
    }

    function sendWithHeaders(res, options, error) {
        if (error.statusCode in statusCodesToErrorCodes) {
            setLinkHeader(res, options);
            setWwwAuthenticateHeader(res, options, error);
        }
        res.send(error);
    }

    function sendAuthorizationRequired(res, options, error) {
        setLinkHeader(res, options);
        setWwwAuthenticateHeaderWithoutErrorInfo(res, options);
        res.send(error);
    }

    return {
        sendWithHeaders: sendWithHeaders,

        tokenRequired: function (res, options, message) {
            if (message === undefined) {
                message = "Bearer token required.";
            }

            sendWithHeaders(res, options, new restify.UnauthorizedError(message));
        },

        authorizationRequired: function (res, options, message) {
            if (message === undefined) {
                message = "Authorization via bearer token required.";
            }

            sendAuthorizationRequired(res, options, new restify.UnauthorizedError(message));
        },

        tokenInvalid: function (res, options, message) {
            if (message === undefined) {
                message = "Bearer token invalid.";
            }

            sendWithHeaders(res, options, new restify.UnauthorizedError(message));
        }
    };
};
