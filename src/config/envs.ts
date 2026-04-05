import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  KAFKA_BROKERS: string;
}

const envVarsSchema = joi
  .object<EnvVars>({
    PORT: joi.number().required(),
    KAFKA_BROKERS: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envVarsSchema.validate(process.env);

if (error) throw new Error(`Config validation error: ${error.message}`);

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  kafkaBrokers: envVars.KAFKA_BROKERS.split(','),
};
