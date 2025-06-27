'use client';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto bg-zinc-900 rounded-xl shadow-lg p-6 overflow-y-auto max-h-[80vh]">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
          <p className="text-zinc-400">Get help, find answers, and contact support</p>
        </div>

        {/* Quick Start Guide */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Quick Start</h2>
          <ul className="list-disc list-inside text-zinc-300 space-y-2">
            <li>Tap <b>Go Live</b> to start a live video and share your location with responders.</li>
            <li>Use the <b>SOS Emergency</b> button for immediate alerts.</li>
            <li>Add and manage your emergency contacts in your <b>Profile</b>.</li>
            <li>View your emergency alert history in the <b>History</b> section.</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium">What happens when I press "Go Live"?</p>
              <p className="text-zinc-400 text-sm">Your camera and location are shared with emergency responders. A video is recorded and uploaded for responders to review.</p>
            </div>
            <div>
              <p className="font-medium">Who receives my emergency alerts?</p>
              <p className="text-zinc-400 text-sm">Nearby responders and your emergency contacts are notified immediately.</p>
            </div>
            <div>
              <p className="font-medium">How do I update my profile or contacts?</p>
              <p className="text-zinc-400 text-sm">Go to your <b>Profile</b> page to edit your information and manage contacts.</p>
            </div>
            <div>
              <p className="font-medium">Is my location shared in real time?</p>
              <p className="text-zinc-400 text-sm">Yes, your live location is shared with responders while an emergency is active.</p>
            </div>
            <div>
              <p className="font-medium">How do I delete my account?</p>
              <p className="text-zinc-400 text-sm">Contact support at <a href="mailto:support@micall.com" className="text-blue-400 underline">support@micall.com</a> to request account deletion.</p>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Troubleshooting</h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium">Not receiving notifications?</p>
              <p className="text-zinc-400 text-sm">Check your device notification settings and ensure you have granted permission to the app.</p>
            </div>
            <div>
              <p className="font-medium">Camera or microphone not working?</p>
              <p className="text-zinc-400 text-sm">Ensure you have granted camera/microphone permissions in your browser or device settings.</p>
            </div>
            <div>
              <p className="font-medium">Location not updating?</p>
              <p className="text-zinc-400 text-sm">Enable location services and check your browser/device permissions.</p>
            </div>
            <div>
              <p className="font-medium">Can't sign in or reset password?</p>
              <p className="text-zinc-400 text-sm">Use the "Forgot Password" link on the sign-in page or contact support for help.</p>
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
          <p className="text-zinc-400 mb-2">Need more help? Reach out to our support team:</p>
          <ul className="list-none text-zinc-300">
            <li>Email: <a href="mailto:support@micall.com" className="text-blue-400 underline">support@micall.com</a></li>
            {/* <li>Phone: +1-800-123-4567</li> */}
          </ul>
        </section>

        {/* Safety Tips */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Safety Tips</h2>
          <ul className="list-disc list-inside text-zinc-300 space-y-2">
            <li>Stay calm and follow instructions from responders.</li>
            <li>Keep your phone charged and accessible at all times.</li>
            <li>Share your location only with trusted contacts and responders.</li>
            <li>Use the app only in real emergencies or for testing in simulation mode.</li>
          </ul>
        </section>

        {/* Legal & Privacy */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Legal</h2>
          <ul className="list-none text-zinc-300">
            <li><a href="/privacy" className="text-blue-400 underline">Privacy Policy</a></li>
            <li><a href="/terms" className="text-blue-400 underline">Terms of Service</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
} 