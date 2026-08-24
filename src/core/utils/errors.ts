export class InternalServerError extends Error {
  statusCode: number;
  constructor(options?: Record<string, any>) {
    super(options?.message || "An unexpected internal error occurred.", {
      cause: options?.cause,
    });
    this.statusCode = 500;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class ValidationError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "An validation error occurred.", {
      cause: options?.cause,
    });
    this.statusCode = 400;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class ConflictError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "An conflict error occurred.", {
      cause: options?.cause,
    });
    this.statusCode = 409;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "Resource not found.", { cause: options?.cause });
    this.statusCode = 404;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class UnauthorizedError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "Unauthorized user.", { cause: options?.cause });
    this.statusCode = 401;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class ForbiddenError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "Forbidden access.", { cause: options?.cause });
    this.statusCode = 403;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class PayloadTooLargeError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "Payload too large.", { cause: options?.cause });
    this.statusCode = 413;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class TooManyRequestsError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "Too many requests.", { cause: options?.cause });
    this.statusCode = 429;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}

export class UnsupportedMediaTypeError extends Error {
  statusCode: number;
  constructor(message?: string, options?: Record<string, any>) {
    super(message || "Unsupported media type.", { cause: options?.cause });
    this.statusCode = 415;
  }

  toJSON() {
    return {
      title: this.message,
      status: this.statusCode,
    };
  }
}
