import React from 'react';
import { Phone, Plus, Star } from 'lucide-react';

const ContactsList = () => {
  const contacts = [
    { id: 1, name: 'Emergency Contact 1', phone: '+1234567890', isPrimary: true },
    { id: 2, name: 'Emergency Contact 2', phone: '+0987654321', isPrimary: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Emergency Contacts</h2>
        <button className="p-2 rounded-full bg-primary text-primary-foreground">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="p-4 bg-card rounded-lg border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {contact.name}
                  {contact.isPrimary && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
              </div>
            </div>
            <button className="text-primary hover:text-primary/80">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactsList; 