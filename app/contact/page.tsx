import { Metadata } from 'next';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us | StudIQ',
  description: 'Get in touch with StudIQ. We\'re here to help with any questions about our AI-powered learning platform.',
  openGraph: {
    title: 'Contact StudIQ',
    description: 'Get in touch with StudIQ. We\'re here to help with any questions about our AI-powered learning platform.',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600">
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll
            respond as soon as possible.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <ContactForm />
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Email</h3>
            <p className="text-gray-600">support@studiq.fun</p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Office Hours</h3>
            <p className="text-gray-600">Monday - Friday<br />9:00 AM - 6:00 PM WAT</p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Location</h3>
            <p className="text-gray-600">Lagos,<br />Nigeria</p>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>
            For urgent matters, please email us directly at{' '}
            <a
              href="mailto:urgent@studiq.com"
              className="text-blue-600 hover:text-blue-800"
            >
              urgent@studiq.fun
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}