import '../../../../core/error/error_handler.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/dio_client.dart';
import '../models/payment.dart';

class PaymentRepository {
  final DioClient _dioClient;

  PaymentRepository(this._dioClient);

  Future<List<String>> getProviders() async {
    try {
      final response = await _dioClient.dio.get(ApiEndpoints.paymentProviders);
      final list = response.data as List<dynamic>? ?? const [];
      return list.map((item) => item.toString()).toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<InitiatePaymentResponse> initiatePayment(
    InitiatePaymentRequest request,
  ) async {
    try {
      final response = await _dioClient.dio.post(
        ApiEndpoints.paymentInitiate,
        data: request.toJson(),
      );
      return InitiatePaymentResponse.fromJson(
          response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<VerifyPaymentResponse> verifyPayment(
      VerifyPaymentRequest request) async {
    try {
      final response = await _dioClient.dio.post(
        ApiEndpoints.paymentVerify,
        data: request.toJson(),
      );
      return VerifyPaymentResponse.fromJson(
          response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<List<PaymentTransaction>> getTransactions() async {
    try {
      final response = await _dioClient.dio.get(ApiEndpoints.payments);
      final list = response.data as List<dynamic>? ?? const [];
      return list
          .map((item) =>
              PaymentTransaction.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<PaymentTransaction> getTransaction(String transactionId) async {
    try {
      final response = await _dioClient.dio.get(
        '${ApiEndpoints.payments}$transactionId/',
      );
      return PaymentTransaction.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
