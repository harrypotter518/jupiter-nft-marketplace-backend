
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import User from '~/database/models/user';
import commonConstants from '~/constants/common';
import messageConstants from '~/constants/message';
import utils from '~/utils';

exports.register = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    let user = await User.findOne({ email: { $regex: new RegExp('^' + email.toLowerCase() + '$', 'i') } });
    if (!utils.isEmpty(user)) {
      return res.status(402).json({
        message: messageConstants.AUTH_EMAIL_EXISTED_ERROR
      });
    }

    const hashedPassword = await bcrypt.hash(password, commonConstants.BCRYPT_LENGTH);
    user = new User({
      email,
      name,
      password: hashedPassword
    });
    await user.save();

    res.status(200).json({
      message: messageConstants.AUTH_REGISTER_SUCCESS
    });
  } catch (error) {
    console.log('[routes AuthAPI register] error => ', error);
    return res.status(500).json({
      message: messageConstants.SOMETHING_WENT_WRONG
    });
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email: { $regex: new RegExp('^' + email.toLowerCase() + '$', 'i') } });
    if (utils.isEmpty(user)) {
      return res.status(404).json({
        message: messageConstants.AUTH_USER_NOT_FOUND
      });
    }

    if (!user.verified) {
      return res.status(404).json({
        message: messageConstants.USER_VERIFIED_ERROR
      });
    }

    const matchPasswords = bcrypt.compareSync(password, user.password);
    if (!matchPasswords) {
      return res.status(404).json({
        message: messageConstants.AUTH_INVALID_CREDENTIAL
      });
    }
    user.lastLoginAt = new Date();
    user.save();

    const payload = {
      id: user._id,
      type: user.type
    }
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: commonConstants.EXPIRE_TIME });

    res.status(200).json({
      user: user,
      token: `Bearer ${jwtToken}`
    });
  } catch (error) {
    console.log('[routes AuthAPI login] error => ', error);
    return res.status(500).json({
      message: messageConstants.SOMETHING_WENT_WRONG
    });
  }
}
