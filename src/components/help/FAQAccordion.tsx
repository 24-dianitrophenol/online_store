import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
  title?: string;
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ 
  faqs, 
  title = "Frequently Asked Questions" 
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="w-full">
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {title}
        </h2>
      )}
      
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div 
            key={faq.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(faq.id)}
              className="flex justify-between items-center w-full p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-expanded={openId === faq.id}
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {faq.question}
              </span>
              {openId === faq.id ? (
                <ChevronUp className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            
            <div 
              className={`transition-all duration-300 overflow-hidden ${
                openId === faq.id 
                  ? 'max-h-96' 
                  : 'max-h-0'
              }`}
            >
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQAccordion;