import { ApiErrorInterface } from "../interfaces";

export default class HttpError extends Error {
    public readonly opts: ApiErrorInterface;

    constructor(opts: ApiErrorInterface) {
        super(opts.detail);
        this.opts = opts;
        Error.captureStackTrace(this);
    }

    sendError(res: any) {
        return res.status(this.opts.code).json({
            errors: [
                {
                    title: this.opts.title,
                    detail: this.opts.detail,
                    code: this.opts.code,
                },
            ],
        });
    }

    // Static factory methods for common errors
    static badRequest(detail: string, title: string = 'Bad Request') {
        return new HttpError({ title, detail, code: 400 });
    }

    static unauthorized(detail: string, title: string = 'Unauthorized') {
        return new HttpError({ title, detail, code: 401 });
    }

    static forbidden(detail: string, title: string = 'Forbidden') {
        return new HttpError({ title, detail, code: 403 });
    }

    static notFound(detail: string, title: string = 'Not Found') {
        return new HttpError({ title, detail, code: 404 });
    }

    static tooManyRequests(detail: string, title: string = 'Too Many Requests') {
        return new HttpError({ title, detail, code: 429 });
    }

    static internalServerError(detail: string, title: string = 'Internal Server Error') {
        return new HttpError({ title, detail, code: 500 });
    }

    static serviceUnavailable(detail: string, title: string = 'Service Unavailable') {
        return new HttpError({ title, detail, code: 503 });
    }
}
