import Joi from 'joi';

export const validateContact = (data: any) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .required(),
    phone: Joi.string()
      .pattern(/^\+?[\d\s-]{10,}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      }),
    email: Joi.string()
      .email()
      .optional(),
    relationship: Joi.string()
      .required()
      .valid('family', 'friend', 'colleague', 'other'),
    notificationPreference: Joi.string()
      .required()
      .valid('sms', 'email', 'both')
  });

  return schema.validate(data);
}; 