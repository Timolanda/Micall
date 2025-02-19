import React, { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { Loader2, UserPlus, UserMinus, CheckCircle, AlertTriangle } from 'lucide-react';
import { AddContactForm } from './AddContactForm';
import { Contact } from '../types';

interface ContactCardProps {
  contact: Contact;
  onVerify: (data: { contactId: string; code: string }) => void;
  onRemove: (id: string) => void;
  isVerifying: boolean;
  isRemoving: boolean;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onVerify,
  onRemove,
  isVerifying,
  isRemoving
}) => {
  const [verificationCode, setVerificationCode] = useState('');

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{contact.name}</h3>
          <p className="text-sm text-gray-600">{contact.phone}</p>
          {contact.email && (
            <p className="text-sm text-gray-600">{contact.email}</p>
          )}
          <p className="text-sm text-gray-500 capitalize">
            {contact.relationship}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {contact.verified ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          <button
            onClick={() => onRemove(contact.id)}
            disabled={isRemoving}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <UserMinus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!contact.verified && (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter verification code"
            className="w-full px-3 py-2 border rounded"
          />
          <button
            onClick={() => onVerify({ contactId: contact.id, code: verificationCode })}
            disabled={isVerifying || !verificationCode}
            className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isVerifying ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              'Verify Contact'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export const ContactManagement: React.FC = () => {
  const {
    contacts,
    isLoading,
    addContact,
    verifyContact,
    removeContact,
    isAdding,
    isVerifying,
    isRemoving
  } = useContacts();

  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Emergency Contacts</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="h-5 w-5" />
          Add Contact
        </button>
      </div>

      {showAddForm && (
        <AddContactForm 
          onAdd={addContact} 
          onCancel={() => setShowAddForm(false)}
          isAdding={isAdding}
        />
      )}

      <div className="grid gap-4">
        {contacts.map(contact => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onVerify={verifyContact}
            onRemove={removeContact}
            isVerifying={isVerifying}
            isRemoving={isRemoving}
          />
        ))}
      </div>
    </div>
  );
}; 