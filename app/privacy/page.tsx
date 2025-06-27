'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto bg-zinc-900 rounded-xl shadow-lg p-6 overflow-y-auto max-h-[80vh]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">MiCall Privacy Policy</h1>
          <p className="text-zinc-400">Last Updated: 27/05/2023</p>
        </div>

        <p className="mb-6 text-zinc-300">
          MiCall (“we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use the MiCall mobile app, website, and related services (“Services”).
        </p>

        <h2 className="text-xl font-semibold mb-2 mt-8">1. What We Collect</h2>
        <p className="mb-2 text-zinc-300">We collect the following types of data to ensure safety and improve your experience:</p>
        <ul className="list-disc list-inside text-zinc-300 mb-4">
          <li><b>Personal Information:</b> Name, Email address, Phone number, Emergency contact details</li>
          <li><b>Device & Location Data:</b> Precise location (for real-time emergency tracking), Device identifiers, IP address, App usage data (crashes, performance)</li>
          <li><b>Emergency Data:</b> Live video recordings (when you press "Go Live"), SOS alerts and related timestamps, Uploaded photos/audio (if used in future updates)</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 mt-8">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-zinc-300 mb-4">
          <li>Responding to emergency alerts and enabling location-based support</li>
          <li>Notifying your saved emergency contacts</li>
          <li>Improving app performance and reliability</li>
          <li>Enabling features like “Go Live” and real-time responder maps</li>
          <li>Complying with legal and safety regulations</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 mt-8">3. Who We Share Data With</h2>
        <p className="mb-2 text-zinc-300">We never sell your personal data. We only share data in the following cases:</p>
        <ul className="list-disc list-inside text-zinc-300 mb-4">
          <li><b>Emergency Contacts:</b> When you activate SOS or Go Live</li>
          <li><b>Authorized Responders:</b> To provide support and locate you in emergencies</li>
          <li><b>Service Providers:</b> For hosting, analytics, and storage (e.g., Supabase)</li>
          <li><b>Law Enforcement:</b> Only when legally required and to prevent harm</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 mt-8">4. Data Storage & Security</h2>
        <ul className="list-disc list-inside text-zinc-300 mb-4">
          <li>Your data is encrypted in transit and at rest</li>
          <li>We use secure third-party platforms (e.g., Supabase) for data storage</li>
          <li>Access to personal information is strictly limited to authorized personnel</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 mt-8">5. Your Rights & Choices</h2>
        <ul className="list-disc list-inside text-zinc-300 mb-4">
          <li>Access your data</li>
          <li>Update or delete your profile</li>
          <li>Disable location sharing (although it may affect emergency features)</li>
          <li>Contact us about any privacy concern at <a href="mailto:timolanda@gmail.com" className="text-blue-400 underline">timolanda@gmail.com</a></li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 mt-8">6. Children's Privacy</h2>
        <p className="mb-4 text-zinc-300">MiCall is not intended for users under the age of 13. We do not knowingly collect personal data from children without parental consent.</p>

        <h2 className="text-xl font-semibold mb-2 mt-8">7. Updates to This Policy</h2>
        <p className="mb-4 text-zinc-300">We may update this policy from time to time. Any changes will be posted in the app and on our website. We encourage you to review this policy regularly.</p>

        <h2 className="text-xl font-semibold mb-2 mt-8">8. Contact Us</h2>
        <ul className="list-none text-zinc-300 mb-8">
          <li>📧 Email: <a href="mailto:support@micall.app" className="text-blue-400 underline">support@micall.app</a></li>
          <li>📍 Address: Nairobi, Kenya (or insert physical location if applicable)</li>
          <li>🌐 Website: <a href="https://micall.app" className="text-blue-400 underline">https://micall.app</a></li>
        </ul>
      </div>
    </div>
  );
} 