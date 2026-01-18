const mongoose = require('mongoose');
const slugify = require('slugify');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [50, 'Tag name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  }
}, {
  timestamps: true
});

// Create slug from name before saving
tagSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true
    });
  }
  next();
});

// Index for efficient querying
tagSchema.index({ name: 1 });
tagSchema.index({ usageCount: -1 });

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;
