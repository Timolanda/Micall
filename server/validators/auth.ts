import Joi from 'joi';

export const validateWalletLogin = (data: any) => {
  const schema = Joi.object({
    walletAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid Ethereum address format'
      }),
    signature: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{130}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid signature format'
      })
  });

  return schema.validate(data);
}; 