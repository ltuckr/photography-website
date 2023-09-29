const { AuthenticationError } = require('apollo-server-express');
const { User, Project, Purchase, Favorite, Comment, ClientGallery } = require('../models');
const stripe = require('stripe')('sk_test_51NvUcJFzf7sBath1WbibjPnUNGsnSOHkYghnuuzIi881aZ4nBMEqsyNzWbkpZuSZ0HIa4NzLzKovJDGPSBt47wOI00BgOfBWre');



const resolvers = {
  Query: {
    users: async () => {
      return User.find({});
    },
    projects: async () => {
      return Project.find({});
    },
    purchases: async () => {
      return Purchase.find({});
    },
    favorites: async () => {
      return Favorite.find({});
    },
    comments: async () => {
      return Comment.find({});
    },
    clientGalleryImages: async (_, args) => {
      try {
        // Retrieve client gallery images for a specific client user
        const { clientUserId } = args; // Arguments passed in from the client

        // Find the client gallery for the specified client user
        const clientGallery = await ClientGallery.findOne({ clientUserId }).populate('images');

        if (!clientGallery) {
          throw new Error('Client gallery not found');
        }

        return clientGallery.images;
      } catch (error) {
        throw new Error(`Error fetching client gallery images: ${error.message}`);
      }
    },

    // stripe 
    product: async (parent, { _id}) => {
      return await Project.findById(_id).populate('clientGallery');
    },
    user: async (parent, args, context) => {
      if (context.user) { 
        const user = await User.findById(context.user._id).populate({
          path: 'ClientGallery.Project',
          populate: 'clientGallery'
        });

        user.ClientGallery.sort((a,b) => b.purchaseDate - a.purchaseDate);

        return user;
      }
      throw new AuthenticationError('Not logged in.');
    },
    order: async (parent, { _id }, context) => {
      if (context.user) {
        const user = await User.findById(context.user._id).populate({
          path: 'ClientGallery.Project',
          populate: 'clientGallery'
        });
        return user.ClientGallery.id(_id);
      }

      throw new AuthenticationError('Not logged in');
    },

    checkout: async (parent, args, context) => {
      const url = new URL(context.headers.referer).origin;
      await new Purchase({ products: args.products });
      const line_items = [];

      for (const product of args.products) {
        line_items.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description
            },
          },
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
      });
      
      return { session: sessions.id };
    }
  },
  Mutation: {
    createUser: async (parent, args) => {
      const user = await User.create(args);
      return user;
    },
    createProject: async (parent, args) => {
      const project = await Project.create(args);
      return project;
    },
    createPurchase: async (parent, args) => {
      const purchase = await Purchase.create(args);
      return purchase;
    },
    createFavorite: async (parent, args) => {
      const favorite = await Favorite.create(args);
      return favorite;
    },
    createComment: async (parent, args) => {
      const comment = await Comment.create(args);
      return comment;
    },
  },
};

module.exports = resolvers;
