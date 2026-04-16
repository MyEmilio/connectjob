const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Titlul este obligatoriu"],
      minlength: [3, "Titlul trebuie sa aiba minim 3 caractere"],
      maxlength: [200, "Titlul poate avea maxim 200 caractere"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: [5000, "Descrierea poate avea maxim 5000 caractere"],
      trim: true,
    },
    category: {
      type: String,
      default: "",
      maxlength: [100, "Categoria poate avea maxim 100 caractere"],
      trim: true,
    },
    salary: {
      type: Number,
      required: [true, "Salariul este obligatoriu"],
      min: [0, "Salariul nu poate fi negativ"],
      max: [1000000, "Salariul depaseste limita"],
    },
    type: {
      type: String,
      enum: {
        values: ["part-time", "full-time"],
        message: "Tipul trebuie sa fie part-time sau full-time",
      },
      default: "part-time",
    },
    urgent: { type: Boolean, default: false },
    is_demo: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    promoted: { type: Boolean, default: false },
    second_job: { type: Boolean, default: false },
    work_duration: {
      type: String,
      enum: {
        values: ["ore", "zile", "permanent"],
        message: "Durata trebuie sa fie ore, zile sau permanent",
      },
      default: "zile",
    },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    skills: { type: [String], default: [] },
    icon: { type: String, default: "💼", maxlength: 10 },
    color: { type: String, default: "#059669", maxlength: 20 },
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Compound indexes for common queries
jobSchema.index({ status: 1, category: 1, created_at: -1 });
jobSchema.index({ active: 1, promoted: -1, created_at: -1 });
jobSchema.index({ active: 1, category: 1, created_at: -1 });

// 2dsphere index for geospatial queries
jobSchema.index({ lat: 1, lng: 1 });

jobSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Job", jobSchema);
