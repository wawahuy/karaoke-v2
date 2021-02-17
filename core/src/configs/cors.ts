import cors from "cors";

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // db.loadOrigins is an example call to load
    // a list of origins from a backing database
    callback(null, origin);
  },
};

export default corsOptions;
