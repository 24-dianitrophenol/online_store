import React from 'react';
import FAQAccordion from '../components/help/FAQAccordion';
import { FAQS } from '../mocks/data';
import { MessageCircle, Phone, Mail, Clock, MapPin, ExternalLink } from 'lucide-react';

const HelpPage: React.FC = () => {
  const handleWhatsAppClick = () => {
    const phoneNumber = '256763721005';
    const message = 'Hello! I need help with my order.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="pb-20 md:pb-0 max-w-7xl mx-auto px-4">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 dark:from-primary/10 dark:to-secondary/10 rounded-2xl p-10 mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          How Can We Help You?
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          We're here to assist you with any questions or concerns you may have.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <FAQAccordion faqs={FAQS} />

          <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center">
              Contact Our Support Team
            </h2>
            <form className="max-w-3xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-5 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full px-5 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Subject"
                className="w-full px-5 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <textarea
                rows={5}
                placeholder="Your Message"
                className="w-full px-5 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              ></textarea>
              <button
                type="submit"
                className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
              Quick Support
            </h2>
            <button
              onClick={handleWhatsAppClick}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#25D366]/90 transition-colors"
            >
              <MessageCircle size={24} />
              Chat on WhatsApp
              <ExternalLink size={18} />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white text-center">
              Contact Information
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
                <Phone className="text-primary" size={20} />
                <span>+256 763 721 005</span>
              </div>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
                <Mail className="text-primary" size={20} />
                <span>support@foodhub.com</span>
              </div>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
                <Clock className="text-primary" size={20} />
                <div>
                  <p>Mon-Fri: 8am-10pm</p>
                  <p>Sat-Sun: 9am-9pm</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
                <MapPin className="text-primary" size={20} />
                <div>
                  <p>123 Food Street</p>
                  <p>Tasty City, TC 12345</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
