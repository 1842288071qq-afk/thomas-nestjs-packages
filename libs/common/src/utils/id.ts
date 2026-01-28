import Snowflakify from 'snowflakify';

export const snowflakeIdGenerator = new Snowflakify({
  epoch: 1672531200000, // Custom epoch (e.g., Jan 1, 2023)
});
