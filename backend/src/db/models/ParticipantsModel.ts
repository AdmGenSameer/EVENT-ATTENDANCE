import  mongoose,{Schema} from 'mongoose';

const participantsSchema = new Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    checkedIn: {
        type: Boolean,
        default: false,
    },
    registrationNumber: {
        type: String,
        required: true,     
    },
}, {
    timestamps: true,
});

export const Participants = mongoose.model('Participants', participantsSchema);
