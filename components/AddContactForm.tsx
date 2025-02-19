import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';
import { Contact } from '../types';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  relationship: z.enum(['family', 'friend', 'colleague', 'other']),
  notificationPreference: z.enum(['sms', 'email', 'both'])
});

type ContactFormData = z.infer<typeof contactSchema>;

interface AddContactFormProps {
  onAdd: (data: ContactFormData) => void;
  onCancel: () => void;
  isAdding?: boolean;
}

export const AddContactForm: React.FC<AddContactFormProps> = ({
  onAdd,
  onCancel,
  isAdding = false
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      notificationPreference: 'sms'
    }
  });

  const email = watch('email');

  const onSubmit = handleSubmit((data) => {
    onAdd(data);
  });

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Add Emergency Contact</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-gray-500 hover:bg-gray-100 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            {...register('name')}
            className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Contact name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            {...register('phone')}
            className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1234567890"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email (Optional)
          </label>
          <input
            {...register('email')}
            type="email"
            className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="contact@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Relationship
          </label>
          <select
            {...register('relationship')}
            className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="family">Family</option>
            <option value="friend">Friend</option>
            <option value="colleague">Colleague</option>
            <option value="other">Other</option>
          </select>
          {errors.relationship && (
            <p className="mt-1 text-sm text-red-600">{errors.relationship.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notification Preference
          </label>
          <select
            {...register('notificationPreference')}
            className="mt-1 w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="sms">SMS Only</option>
            {email && <option value="email">Email Only</option>}
            {email && <option value="both">Both SMS and Email</option>}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isAdding}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            'Add Contact'
          )}
        </button>
      </div>
    </form>
  );
}; 