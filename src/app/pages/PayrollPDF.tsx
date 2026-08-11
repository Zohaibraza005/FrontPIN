import {
    Document,
    Page,
    Text,
    View,
    StyleSheet
  } from "@react-pdf/renderer";
  import moment from "moment";
  
  export const PayrollSlipPDF = ({ payroll }) => (
    <Document>
      <Page size="A4" style={{ padding: 30 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          Salary Slip
        </Text>
  
        <Text>
          Employee: {payroll.employee.firstName} {payroll.employee.lastName}
        </Text>
  
        <Text>
          Period: {moment(payroll.periodStart).format("DD MMM YYYY")}
        </Text>
  
        <View style={{ marginTop: 20 }}>
          <Text>Base Salary: {payroll.rate}</Text>
          <Text>Overtime: {payroll.overtimeAmount}</Text>
          <Text>Net Salary: {payroll.netSalary}</Text>
        </View>
  
      </Page>
    </Document>
  );