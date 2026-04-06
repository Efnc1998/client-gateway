import { Catch, ArgumentsHost, ExceptionFilter, Logger } from '@nestjs/common';

import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcCustomExceptionFilter.name);

  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const rpcError = exception.getError();

    this.logger.error(`RPC Error received: ${JSON.stringify(rpcError)}`);
    this.logger.error(`RPC Error type: ${typeof rpcError}`);
    if (rpcError instanceof Error) {
      this.logger.error(`RPC Error message: ${rpcError.message}`);
    }

    if (
      typeof rpcError === 'object' &&
      'status' in rpcError &&
      'message' in rpcError
    ) {
      const status = isNaN(+rpcError.status) ? 400 : +rpcError.status;
      response.status(status).json(rpcError);
      return;
    }

    const message =
      rpcError instanceof Error
        ? rpcError.message
        : typeof rpcError === 'string'
          ? rpcError
          : 'Internal server error';

    response.status(400).json({
      status: 400,
      message,
    });
  }
}
