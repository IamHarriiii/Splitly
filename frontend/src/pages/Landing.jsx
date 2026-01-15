import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Sparkles, 
  Users, 
  Receipt, 
  Scale, 
  Bot, 
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Smart Groups',
      description: 'Create groups for trips, roommates, or any shared expenses',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      icon: Receipt,
      title: 'Easy Tracking',
      description: 'Track expenses with multiple split types: equal, exact, or percentage',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
    {
      icon: Scale,
      title: 'Auto Settlement',
      description: 'Automatically calculate who owes whom and settle up easily',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600'
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Add expenses naturally with AI: "I paid $50 for dinner"',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'Beautiful charts and insights into your spending patterns',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      icon: Shield,
      title: 'Secure',
      description: 'Your data is encrypted and protected with industry standards',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600'
    },
  ];

  const benefits = [
    'Split bills in seconds',
    'Track group expenses',
    'Settle debts easily',
    'AI-powered entry',
    'Beautiful analytics',
    'Free forever'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Splitly</h1>
              <p className="text-sm text-slate-600">Smart Expense Splitting</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/login')}
            variant="outline"
            className="border-slate-300 hover:bg-slate-50"
          >
            Sign In
          </Button>
        </div>

        {/* Hero Content */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Split Expenses.<br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Stay Friends.
            </span>
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            The easiest way to share expenses with friends, roommates, and groups. 
            Track, split, and settle up in seconds.
          </p>
          <Button 
            onClick={() => navigate('/signup')}
            size="lg"
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            Get Started Free
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-slate-200 bg-white hover:shadow-lg transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}>
                  <feature.icon className={feature.iconColor} size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="border-slate-200 bg-white mb-12">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Why Choose Splitly?</h3>
              <p className="text-slate-600">Everything you need to manage shared expenses</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
                  <span className="font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">Ready to get started?</h3>
          <p className="text-slate-600 mb-6">Join thousands of users splitting expenses the smart way</p>
          <Button 
            onClick={() => navigate('/signup')}
            size="lg"
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            Create Free Account
            <Sparkles className="ml-2" size={20} />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-500 text-sm">
            © 2026 Splitly. Made with ❤️ for better expense sharing.
          </p>
        </div>
      </div>
    </div>
  );
}
