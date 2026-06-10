import { CheckCircle, Crown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const plans = [
  {
    name: 'Home Farmer',
    price: 'TBD',
    description: 'Perfect for home gardens and small plots',
    limits: ['1 farm', '5 plots', 'Unlimited AI queries', 'All features'],
    highlight: false,
  },
  {
    name: 'Small Farmer',
    price: 'TBD',
    description: 'For smallholder farmers with multiple plots',
    limits: ['3 farms', '20 plots', 'Unlimited AI queries', 'Priority support', 'All features'],
    highlight: true,
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Choose a plan</h1>
        <p className="text-gray-500 text-sm mt-0.5">Unlock the full power of Bhoomi.Agri for your farm.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className={`card flex flex-col gap-4 ${plan.highlight ? 'border-2 border-leaf-500 relative' : ''}`}>
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-leaf-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Most popular
                </span>
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900">{plan.name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{plan.description}</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">LKR {plan.price}</span>
              <span className="text-gray-500 text-sm">/month</span>
            </div>
            <ul className="space-y-2">
              {plan.limits.map((limit) => (
                <li key={limit} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-leaf-500 flex-shrink-0" />
                  {limit}
                </li>
              ))}
            </ul>
            <button disabled className="btn-primary w-full opacity-60 cursor-not-allowed mt-auto">
              Coming soon
            </button>
          </div>
        ))}
      </div>

      <div className="card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Payment gateway coming soon.</strong> Bhoomi.Agri v1 is in early access.
          Contact us to arrange a subscription manually.
        </p>
      </div>

      {user?.subscription_status === 'trial' && (
        <div className="card">
          <p className="text-sm text-gray-600">
            You are currently on a <strong>free trial</strong>.
            Trial includes 20 AI queries, 1 farm, and 3 plots.
          </p>
        </div>
      )}
    </div>
  );
}
