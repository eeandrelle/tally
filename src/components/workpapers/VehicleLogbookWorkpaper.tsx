import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useVehicleLogbook } from '@/hooks/useVehicleLogbook';
import { TripType, Vehicle } from '@/lib/vehicle-logbook';
import { 
  Car, 
  Plus, 
  Play, 
  Square, 
  MapPin, 
  Briefcase, 
  User, 
  Calendar,
  Clock,
  Gauge,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Edit,
  TrendingUp,
  Navigation
} from 'lucide-react';

export function VehicleLogbookWorkpaper() {
  const logbook = useVehicleLogbook();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [editingTrip, setEditingTrip] = useState<string | null>(null);
  
  // Form states
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    odometerReading: 0,
  });
  
  const [tripForm, setTripForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    startOdometer: 0,
    endOdometer: 0,
    type: 'business' as TripType,
    purpose: '',
    startLocation: '',
    endLocation: '',
  });
  
  const [trackingOdometer, setTrackingOdometer] = useState(0);
  
  // Handlers
  const handleAddVehicle = () => {
    if (vehicleForm.name && vehicleForm.registration) {
      logbook.addVehicle({
        ...vehicleForm,
        odometerDate: new Date().toISOString().split('T')[0],
      });
      setVehicleForm({
        name: '',
        registration: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        odometerReading: 0,
      });
      setShowAddVehicle(false);
    }
  };
  
  const handleAddTrip = () => {
    const result = logbook.addTrip({
      ...tripForm,
      trackingMethod: 'manual',
    });
    if (result.success) {
      setShowAddTrip(false);
      setTripForm({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        startOdometer: tripForm.endOdometer,
        endOdometer: tripForm.endOdometer,
        type: 'business',
        purpose: '',
        startLocation: '',
        endLocation: '',
      });
    } else {
      alert(result.errors.join('\n'));
    }
  };
  
  const handleStartTracking = () => {
    if (logbook.activeVehicleId) {
      logbook.startTracking(
        logbook.activeVehicleId, 
        'business',
        '',
        logbook.activeVehicle?.odometerReading
      );
      setShowTracking(true);
    }
  };
  
  const handleStopTracking = () => {
    const trip = logbook.stopTracking(trackingOdometer);
    if (trip) {
      setShowTracking(false);
      setTrackingOdometer(0);
    } else {
      alert('Failed to save trip. Please check odometer reading.');
    }
  };
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress toward 12-week requirement
  const weekProgress = Math.min((logbook.weeklySummaries.length / 12) * 100, 100);
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicle Logbook</h1>
          <p className="text-muted-foreground">
            ATO-compliant digital logbook with GPS tracking
          </p>
        </div>
        <div className="flex gap-2">
          {logbook.activeVehicle && (
            <Button onClick={() => setShowAddTrip(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Trip
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAddVehicle(true)}>
            <Car className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>
      
      {/* Vehicle Selector */}
      {logbook.vehicles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Label className="text-sm font-medium whitespace-nowrap">Active Vehicle:</Label>
              <Select 
                value={logbook.activeVehicleId || ''} 
                onValueChange={logbook.setActiveVehicle}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {logbook.vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.registration})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {logbook.activeVehicle && (
                <div className="flex gap-2 ml-auto">
                  <Badge variant="outline">
                    Odometer: {logbook.activeVehicle.odometerReading.toLocaleString()} km
                  </Badge>
                  {logbook.activeVehicle.isLogbookActive ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Logbook Active
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => logbook.startLogbookPeriod(
                        logbook.activeVehicle!.id,
                        new Date().toISOString().split('T')[0]
                      )}
                    >
                      Start 12-Week Logbook
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* No Vehicle State */}
      {logbook.vehicles.length === 0 && (
        <Alert>
          <Car className="h-4 w-4" />
          <AlertTitle>No vehicles added</AlertTitle>
          <AlertDescription>
            Add your first vehicle to start tracking trips and maintaining an ATO-compliant logbook.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Content */}
      {logbook.activeVehicle && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Trips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{logbook.stats.totalTrips}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Business %
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{logbook.stats.businessPercentage}%</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Distance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {logbook.stats.totalDistance.toFixed(1)} km
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Business Distance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {logbook.stats.businessDistance.toFixed(1)} km
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={() => setShowAddTrip(true)} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
                <Button 
                  onClick={logbook.isTracking ? () => setShowTracking(true) : handleStartTracking}
                  variant={logbook.isTracking ? "destructive" : "default"}
                  className="flex-1"
                >
                  {logbook.isTracking ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Stop Tracking ({formatDuration(logbook.trackingDuration)})
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start GPS Tracking
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle>Logbook Compliance</CardTitle>
                <CardDescription>
                  ATO requires 12 consecutive weeks of recording
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to 12 weeks</span>
                    <span>{logbook.weeklySummaries.length} / 12 weeks</span>
                  </div>
                  <Progress value={weekProgress} />
                </div>
                
                {logbook.compliance.warnings.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Compliance Issues</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {logbook.compliance.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {logbook.compliance.canBeUsedForTax && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>ATO Compliant</AlertTitle>
                    <AlertDescription>
                      Your logbook meets ATO requirements and can be used for tax deductions.
                      Valid until {new Date(logbook.compliance.expiryDate).toLocaleDateString()}.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Trips Tab */}
          <TabsContent value="trips">
            <Card>
              <CardHeader>
                <CardTitle>Trip History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logbook.trips.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No trips recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        [...logbook.trips]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(trip => (
                            <TableRow key={trip.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {new Date(trip.date).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {trip.startTime} - {trip.endTime}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={trip.type === 'business' ? 'default' : 'secondary'}>
                                  {trip.type === 'business' ? (
                                    <Briefcase className="w-3 h-3 mr-1" />
                                  ) : (
                                    <User className="w-3 h-3 mr-1" />
                                  )}
                                  {trip.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{trip.purpose || '-'}</TableCell>
                              <TableCell>{trip.distance.toFixed(1)} km</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {trip.trackingMethod === 'gps' ? (
                                    <Navigation className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Gauge className="w-3 h-3 mr-1" />
                                  )}
                                  {trip.trackingMethod}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => logbook.deleteTrip(trip.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Progress Tab */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Progress</CardTitle>
                <CardDescription>
                  Track your progress toward the 12-week ATO requirement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logbook.weeklySummaries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Start recording trips to see weekly progress
                    </p>
                  ) : (
                    logbook.weeklySummaries.map((week, index) => (
                      <div key={week.weekStart} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {new Date(week.weekStart).toLocaleDateString()} - {new Date(week.weekEnd).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {week.totalTrips} trips • {week.totalDistance.toFixed(1)} km
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{week.businessPercentage}% business</div>
                          <div className="text-sm text-muted-foreground">
                            {week.businessDistance.toFixed(1)} km
                          </div>
                        </div>
                        <Badge variant={week.isComplete ? "default" : "secondary"}>
                          {week.isComplete ? "Complete" : "In Progress"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Logbook</CardTitle>
                <CardDescription>
                  Download your logbook for tax purposes or accountant review
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">CSV Export</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Export all trips as a CSV file for spreadsheet analysis
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          const csv = logbook.exportCSV();
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `vehicle-logbook-${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">JSON Export</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Export complete logbook data including compliance information
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          const data = logbook.exportData();
                          if (data) {
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `logbook-export-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                {logbook.exportData() && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Ready for Tax</AlertTitle>
                    <AlertDescription>
                      Your logbook has {logbook.stats.totalTrips} trips recorded over {logbook.weeklySummaries.length} weeks.
                      Business use: {logbook.stats.businessPercentage}%
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Add Vehicle Dialog */}
      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Enter your vehicle details to start tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vehicle Name *</Label>
              <Input
                placeholder="e.g., My Toyota Camry"
                value={vehicleForm.name}
                onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Registration Number *</Label>
              <Input
                placeholder="e.g., ABC123"
                value={vehicleForm.registration}
                onChange={e => setVehicleForm({ ...vehicleForm, registration: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  placeholder="e.g., Toyota"
                  value={vehicleForm.make}
                  onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  placeholder="e.g., Camry"
                  value={vehicleForm.model}
                  onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={vehicleForm.year}
                  onChange={e => setVehicleForm({ ...vehicleForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Current Odometer (km)</Label>
                <Input
                  type="number"
                  value={vehicleForm.odometerReading}
                  onChange={e => setVehicleForm({ ...vehicleForm, odometerReading: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVehicle(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVehicle} disabled={!vehicleForm.name || !vehicleForm.registration}>
              Add Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Trip Dialog */}
      <Dialog open={showAddTrip} onOpenChange={setShowAddTrip}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Trip</DialogTitle>
            <DialogDescription>
              Record a new trip manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={tripForm.date}
                  onChange={e => setTripForm({ ...tripForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Trip Type</Label>
                <Select 
                  value={tripForm.type} 
                  onValueChange={(v: TripType) => setTripForm({ ...tripForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={tripForm.startTime}
                  onChange={e => setTripForm({ ...tripForm, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={tripForm.endTime}
                  onChange={e => setTripForm({ ...tripForm, endTime: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Odometer (km)</Label>
                <Input
                  type="number"
                  value={tripForm.startOdometer}
                  onChange={e => setTripForm({ ...tripForm, startOdometer: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Odometer (km)</Label>
                <Input
                  type="number"
                  value={tripForm.endOdometer}
                  onChange={e => setTripForm({ ...tripForm, endOdometer: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            {tripForm.type === 'business' && (
              <div className="space-y-2">
                <Label>Purpose *</Label>
                <Select 
                  value={tripForm.purpose} 
                  onValueChange={v => setTripForm({ ...tripForm, purpose: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {logbook.businessPurposes.map(purpose => (
                      <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Location</Label>
                <Input
                  placeholder="e.g., Home"
                  value={tripForm.startLocation}
                  onChange={e => setTripForm({ ...tripForm, startLocation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Location</Label>
                <Input
                  placeholder="e.g., Office"
                  value={tripForm.endLocation}
                  onChange={e => setTripForm({ ...tripForm, endLocation: e.target.value })}
                />
              </div>
            </div>
            
            {tripForm.endOdometer > tripForm.startOdometer && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Calculated Distance</div>
                <div className="text-lg font-semibold">
                  {(tripForm.endOdometer - tripForm.startOdometer).toFixed(1)} km
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTrip(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTrip}>
              Add Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* GPS Tracking Dialog */}
      <Dialog open={showTracking} onOpenChange={setShowTracking}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>GPS Tracking Active</DialogTitle>
            <DialogDescription>
              Recording your trip. Drive safely!
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
              <Navigation className="w-10 h-10 text-red-600" />
            </div>
            <div className="text-3xl font-bold font-mono">
              {formatDuration(logbook.trackingDuration)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Recording in progress...
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>End Odometer Reading (km) *</Label>
              <Input
                type="number"
                placeholder="Enter current odometer"
                value={trackingOdometer || ''}
                onChange={e => setTrackingOdometer(parseFloat(e.target.value) || 0)}
              />
            </div>
            {logbook.activeTracking?.type === 'business' && !logbook.activeTracking.purpose && (
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select onValueChange={v => {}}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {logbook.businessPurposes.map(purpose => (
                      <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="destructive" className="w-full" onClick={handleStopTracking}>
              <Square className="w-4 h-4 mr-2" />
              Stop & Save Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
