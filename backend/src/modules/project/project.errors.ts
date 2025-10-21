export class ProjectLimitReachedError extends Error {
  code = 'MAX_PROJECTS';
  statusCode = 403;

  constructor(message = 'Project limit reached') {
    super(message);
    this.name = 'ProjectLimitReachedError';
  }
}

export class InsufficientCreditsError extends Error {
  code = 'INSUFFICIENT_CREDITS';
  statusCode = 403;

  constructor(message = 'Insufficient credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export class AccountInactiveError extends Error {
  code = 'ACCOUNT_INACTIVE';
  statusCode = 403;

  constructor(message = 'Account is not active') {
    super(message);
    this.name = 'AccountInactiveError';
  }
}

export class ProjectNotFoundError extends Error {
  code = 'PROJECT_NOT_FOUND';
  statusCode = 404;

  constructor(message = 'Project not found') {
    super(message);
    this.name = 'ProjectNotFoundError';
  }
}
