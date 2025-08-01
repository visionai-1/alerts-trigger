import { Schema, model, Document } from 'mongoose';

/**
 * 🚨 Alert MongoDB Model
 * Mongoose schema and model for weather alerts
 */

// Alert document interface extending mongoose Document
export interface IAlert extends Document {
    type: 'realtime' | 'forecast';
    parameter: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    location: {
        lat?: number;
        lon?: number;
        city?: string;
    };
    timestep?: '1h' | '1d';
    name?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    lastState?: 'triggered' | 'not_triggered';
}

// Alert schema definition
const alertSchema = new Schema<IAlert>({
    type: {
        type: String,
        enum: ['realtime', 'forecast'],
        required: true
    },
    parameter: {
        type: String,
        required: true,
        enum: [
            'temperature',
            'humidity',
            'windSpeed',
            'windDirection',
            'precipitation.intensity',
            'precipitation.probability',
            'visibility',
            'uvIndex',
            'cloudCover',
            'pressure',
            'weatherCode'
        ]
    },
    operator: {
        type: String,
        enum: ['>', '<', '>=', '<=', '==', '!='],
        required: true
    },
    threshold: {
        type: Number,
        required: true
    },
    location: {
        lat: {
            type: Number,
            min: -90,
            max: 90
        },
        lon: {
            type: Number,
            min: -180,
            max: 180
        },
        city: {
            type: String,
            trim: true,
            maxlength: 100
        }
    },
    timestep: {
        type: String,
        enum: ['1h', '1d'],
        required: function(this: IAlert) {
            return this.type === 'forecast';
        }
    },
    name: {
        type: String,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    lastState: {
        type: String,
        enum: ['triggered', 'not_triggered'],
        default: 'not_triggered'
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    versionKey: false
});

// Custom validation: either coordinates (lat + lon) or city must be provided
alertSchema.pre('validate', function(this: IAlert) {
    const hasCoordinates = this.location.lat !== undefined && this.location.lon !== undefined;
    const hasCity = this.location.city !== undefined && this.location.city.trim() !== '';
    
    if (!hasCoordinates && !hasCity) {
        this.invalidate('location', 'Either coordinates (lat + lon) or city must be provided');
    }
});

// Index for efficient queries
alertSchema.index({ type: 1, parameter: 1 });
alertSchema.index({ 'location.lat': 1, 'location.lon': 1 });
alertSchema.index({ 'location.city': 1 });
alertSchema.index({ createdAt: -1 });


// Create and export the Alert model
export const Alert = model<IAlert>('Alert', alertSchema);

// Export the schema for potential reuse
export { alertSchema };