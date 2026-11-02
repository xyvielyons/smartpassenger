"use server"

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
const IPN_ID = process.env.PESAPAL_IPN_ID || 'cd7aaa8f-eaa0-4df0-b20a-dc03af7d769d';

export const authorization = async () => {
  try {
    const apiUrl = 'https://pay.pesapal.com/v3/api/Auth/RequestToken';
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const resp = await axios.post(apiUrl, {
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET
    }, { headers });
    return resp.data.token;
  } catch (error) {
    console.log('An error has occurred (PAUTH)', error);
    throw new Error('Failed to authorize with Pesapal');
  }
}

export const InitiatePayment = async ({
  phoneNumber,
  name,
  email
}: {
  phoneNumber: string,
  name: string,
  email: string
}) => {
  try {
    const uid = uuidv4();
    const pesapalToken = await authorization();
    
    const submitOrderRequestUrl = 'https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest';
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pesapalToken}`
    };
    
    const requestPaymentObject = {
      "id": uid,
      "currency": "KES",
      "amount": "1", // <-- HARDCODED TO 1 KES FOR TESTING
      "description": "Smart Passenger - Matatu Fare",
      "callback_url": `${SERVER_URL}/conductor`,
      "redirect_mode": "",
      "cancellation_url": `${SERVER_URL}/conductor`,
      "notification_id": IPN_ID,
      "branch": "Smart Passenger",
      "billing_address": {
          "email_address": email || "test@example.com",
          "phone_number": phoneNumber,
          "country_code": "KE",
          "first_name": name || "Passenger",
          "middle_name": "",
          "last_name": "",
          "line_1": "Matatu Route",
          "line_2": "",
          "city": "Nairobi",
          "state": "Nairobi",
          "postal_code": "00100",
          "zip_code": "00100"
      }
    };

    const response = await axios.post(submitOrderRequestUrl, requestPaymentObject, { headers });
    return response.data;
  } catch (error: any) {
    console.log('An error has occurred (IP)', error.response?.data || error.message);
    throw new Error('Failed to initiate payment');
  }
}

export const TransactionStatus = async (orderTrackingId: string) => {
  try {
    const pesapalToken = await authorization();
    const IPNURL = `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pesapalToken}`
    };
    const response = await axios.get(IPNURL, { headers });
    return response.data;
  } catch (error) {
    console.log(error, "error getting transaction status");
    throw new Error('Failed to check transaction status');
  }
}
export const RegisterPesapalIPN = async (ipnUrl: string) => {
  try {
    const pesapalToken = await authorization();
    const registerIpnUrl = 'https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN';
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pesapalToken}`
    };

    const requestBody = {
      url: ipnUrl,
      ipn_notification_type: 'POST' // Pesapal will send a POST request to your URL
    };

    const response = await axios.post(registerIpnUrl, requestBody, { headers });
    
    // The response contains the all-important ipn_id
    console.log('IPN Registration Response:', response.data);
    return response.data;
    
  } catch (error: any) {
    console.error('Failed to register IPN:', error.response?.data || error.message);
    throw new Error('Could not register IPN URL');
  }
}