'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Coffee, 
  Bus, 
  BookOpen,
  Users,
  Calendar,
  CreditCard,
  QrCode,
  Clock,
  Star,
  Zap
} from 'lucide-react';

const CAMPUS_SERVICES = [
  {
    id: 1,
    name: 'Campus Cafeteria',
    category: 'Food',
    icon: Coffee,
    rating: 4.5,
    accepts: ['SOL', 'USDC', 'Campus Credits'],
    location: 'Building A, Floor 1',
    hours: '7:00 AM - 10:00 PM',
    featured: true
  },
  {
    id: 2,
    name: 'University Bookstore',
    category: 'Books',
    icon: BookOpen,
    rating: 4.2,
    accepts: ['SOL', 'USDC'],
    location: 'Library Building',
    hours: '8:00 AM - 8:00 PM',
    featured: false
  },
  {
    id: 3,
    name: 'Campus Transport',
    category: 'Transport',
    icon: Bus,
    rating: 4.0,
    accepts: ['SOL', 'Campus Credits'],
    location: 'Various Stops',
    hours: '6:00 AM - 11:00 PM',
    featured: false
  },
  {
    id: 4,
    name: 'Student Activities',
    category: 'Events',
    icon: Users,
    rating: 4.7,
    accepts: ['SOL', 'USDC', 'Campus Credits'],
    location: 'Student Center',
    hours: '9:00 AM - 6:00 PM',
    featured: true
  }
];

const RECENT_PAYMENTS = [
  { id: 1, merchant: 'Campus Cafeteria', amount: 12.50, token: 'USDC', time: '2 hours ago' },
  { id: 2, merchant: 'Printing Services', amount: 2.00, token: 'SOL', time: '1 day ago' },
  { id: 3, merchant: 'Bus Pass', amount: 5.00, token: 'Campus Credits', time: '2 days ago' },
];

const UPCOMING_EVENTS = [
  {
    id: 1,
    title: 'Tech Workshop',
    date: 'Dec 15',
    time: '2:00 PM',
    location: 'CS Building',
    price: 'Free',
    token: null
  },
  {
    id: 2,
    title: 'Career Fair',
    date: 'Dec 18',
    time: '10:00 AM',
    location: 'Main Hall',
    price: 5.00,
    token: 'SOL'
  }
];

export function CampusTools() {
  const [selectedService, setSelectedService] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Campus Tools</h1>
        <p className="text-purple-100">
          Pay for campus services with crypto and discover student events
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Pay */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold">Quick Pay</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Scan QR Code</h3>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Point camera at QR code</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Manual Payment</h3>
                <div className="space-y-3">
                  <Input placeholder="Merchant ID or name" />
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <Button variant="outline">SOL</Button>
                    <Button variant="outline">USDC</Button>
                  </div>
                  <Button className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Campus Services */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Campus Services</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">All</Button>
                <Button variant="outline" size="sm">Food</Button>
                <Button variant="outline" size="sm">Transport</Button>
                <Button variant="outline" size="sm">Events</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CAMPUS_SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <div key={service.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {service.category}
                            </Badge>
                            {service.featured && (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800">
                                ⭐ Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{service.rating}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{service.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{service.hours}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-2">Accepts:</p>
                      <div className="flex flex-wrap gap-1">
                        {service.accepts.map((token) => (
                          <Badge key={token} variant="outline" className="text-xs">
                            {token}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-3" 
                      size="sm"
                      onClick={() => setSelectedService(service)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Quick Pay
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Payments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Campus Payments</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="space-y-3">
              {RECENT_PAYMENTS.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.merchant}</p>
                    <p className="text-sm text-gray-600">{payment.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${payment.amount}</p>
                    <Badge variant="outline" className="text-xs">
                      {payment.token}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campus Credits Balance */}
          <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <h3 className="font-semibold">Campus Credits</h3>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600 mb-1">
                245.50
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Credits available
              </p>
              <Button size="sm" className="w-full">
                Top Up Credits
              </Button>
            </div>
          </Card>

          {/* Upcoming Events */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Upcoming Events</h3>
            </div>
            
            <div className="space-y-3">
              {UPCOMING_EVENTS.map((event) => (
                <div key={event.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-1">{event.title}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3" />
                      <span>{event.date} at {event.time}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      {event.price === 'Free' ? (
                        <Badge className="bg-green-100 text-green-800">Free</Badge>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">${event.price}</span>
                          {event.token && (
                            <Badge variant="outline" className="text-xs">
                              {event.token}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Register
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Student Groups */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold">Student Groups</h3>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Crypto Club</h4>
                  <Badge className="text-xs bg-blue-100 text-blue-800">
                    Member
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Shared wallet: 45.2 SOL
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Study Group</h4>
                  <Badge variant="outline" className="text-xs">
                    Join
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Pool funds for resources
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}